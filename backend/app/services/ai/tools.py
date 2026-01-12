"""
Async Tools for ReAct Agent

Provides a collection of async tool methods for the ReAct agent:
- web_search: DuckDuckGo async search
- search_knowledge_base: ChromaDB semantic search
- ask_user_permission: User permission requests
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class Tools:
    """
    Collection of async tools for the ReAct Agent.

    All methods are static and async to allow non-blocking execution.
    Each tool is wrapped with error handling to prevent agent crashes.
    """

    @staticmethod
    async def web_search(query: str) -> str:
        """
        Perform async web search using DuckDuckGo.

        Args:
            query: Search query string

        Returns:
            Formatted search results (title + snippet), truncated to 1000 chars
        """
        try:
            import asyncio
            from duckduckgo_search import DDGS

            logger.info(f"[TOOLS] Web search for: {query}")

            # Run sync DDGS in thread pool to avoid blocking
            def _search():
                with DDGS() as ddgs:
                    return list(ddgs.text(query, max_results=4))

            results = await asyncio.to_thread(_search)

            if not results:
                return "No search results found."

            # Format results as concise string (Title + Snippet only)
            formatted_results = []
            for r in results:
                title = r.get("title", "")
                snippet = r.get("body", "")
                formatted_results.append(f"**{title}**\n{snippet}")

            output = "\n\n".join(formatted_results)

            if len(output) > 1000:
                output = output[:1000] + "..."

            logger.info(f"[TOOLS] Web search returned {len(results)} results")
            return output

        except Exception as e:
            logger.error(f"[TOOLS] Web search failed: {str(e)}")
            return "Error: Search tool failed. Try a different strategy."

    @staticmethod
    async def search_knowledge_base(query: str, user_id: str) -> Dict[str, Any]:
        """
        Search user's knowledge base using semantic search and fetch content details.

        Args:
            query: Search query string
            user_id: User ID for collection routing

        Returns:
            Dict with formatted text and content_references for UI
        """
        try:
            from app.services.ai.semantic_search import SemanticSearchService
            import asyncio
            import os
            from supabase import create_client

            logger.info(f"[TOOLS] Knowledge base search for user {user_id}: {query}")

            search_service = SemanticSearchService()
            results = await search_service.search(user_id=user_id, query=query, limit=5)

            if not results:
                return {
                    "text": "No relevant content found in your knowledge base.",
                    "content_references": [],
                }

            content_ids = [r.content_id for r in results]

            # Fetch content details
            def _fetch_content():
                supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
                supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
                if not supabase_url or not supabase_key:
                    logger.error("[TOOLS] Missing Supabase credentials")
                    return []

                supabase = create_client(supabase_url, supabase_key)

                # Fetch content and related tags
                response = (
                    supabase.table("content")
                    .select("*, content_tags(tags(tag_name))")
                    .in_("contentid", content_ids)
                    .execute()
                )
                return response.data

            content_details = await asyncio.to_thread(_fetch_content)

            if not content_details:
                return {
                    "text": "Found matching content IDs but couldn't fetch details.",
                    "content_references": [],
                }

            content_references = []
            formatted_items_for_llm = []

            for item in content_details:
                c_id = item.get("contentid", "")
                title = item.get("title", "Untitled")
                source_url = item.get("link", "")
                content_type = item.get("content_type", "")
                description = item.get("description", "")

                tags_list = []
                c_tags = item.get("content_tags", [])
                if c_tags:
                    for t_entry in c_tags:
                        tag_obj = t_entry.get("tags")
                        if tag_obj and isinstance(tag_obj, dict):
                            tags_list.append(tag_obj.get("tag_name", ""))

                content_references.append(
                    {
                        "content_id": c_id,
                        "title": title,
                        "source_url": source_url,
                        "content_type": content_type,
                    }
                )

                if len(description) > 300:
                    description = description[:300] + "..."

                formatted_items_for_llm.append(
                    f"**{title}**\n{description}\nTags: {', '.join(tags_list) if tags_list else 'None'}"
                )

            text_output = (
                f"Found {len(content_details)} relevant items from your knowledge base:\n\n"
                + "\n\n---\n\n".join(formatted_items_for_llm)
            )

            logger.info(
                f"[TOOLS] Knowledge base search returned {len(content_details)} results with content"
            )

            return {"text": text_output, "content_references": content_references}

        except Exception as e:
            logger.error(f"[TOOLS] Knowledge base search failed: {str(e)}")
            return {
                "text": f"Error: Knowledge base search failed. {str(e)}",
                "content_references": [],
            }

    @staticmethod
    async def ask_user_permission(
        reason: str, action: str = "web_search", query: str = ""
    ) -> Dict[str, Any]:
        """
        Request user permission for an action.

        Args:
            reason: Explanation of why permission is needed
            action: The action requiring permission (e.g., "web_search")
            query: The query that would be executed

        Returns:
            Dictionary with permission request status and UI button config
        """
        logger.info(f"[TOOLS] Permission request: {reason}")
        return {
            "status": "permission_required",
            "reason": reason,
            "action": action,
            "query": query,
            "button_text": f"Allow {action.replace('_', ' ').title()}",
        }

    @staticmethod
    def get_tool_descriptions() -> str:
        """
        Get descriptions of all available tools for the system prompt.

        Returns:
            Formatted tool descriptions string
        """
        return """Available tools:
1. web_search: Search the web using DuckDuckGo. Input: search query string.
2. search_knowledge_base: Search the user's saved content. Input: search query string.
3. ask_user_permission: Request permission from user. Input: reason string.
4. final_answer: Provide the final response. Input: your complete answer."""
