"""
ReAct Agent - Async Reasoning + Acting Agent

Production-grade agent implementation using:
- AsyncGroq for LLM interactions
- Async tools for non-blocking execution
- Robust error handling and JSON repair
"""

import json
import logging
import re
from app.services.ai.system_contexts.tagzzs import TAGZZS_SYSTEM_CONTEXT
from typing import Optional, List, Dict, Any, Literal

from pydantic import BaseModel, Field
from groq import AsyncGroq

from .tools import Tools

logger = logging.getLogger(__name__)


class AgentResponse(BaseModel):
    """Structured response from the ReAct Agent."""

    response_text: str
    ui_component: Optional[Dict[str, Any]] = Field(
        default=None,
        description="JSON for UI rendering (e.g., {type: 'table', data: ...})",
    )
    sources: List[Dict[str, str]] = Field(default_factory=list)
    referenced_content: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Content items referenced in the response (for clickable UI boxes)",
    )
    status: Literal["completed", "needs_permission", "error"] = "completed"


SYSTEM_PROMPT = """You are a ReAct Agent. You have access to tools to help answer questions.

{tool_descriptions}

## How to respond:
- To use a tool, output ONLY a JSON object: {{"action": "tool_name", "action_input": "value"}}
- To give the final answer, output: {{"action": "final_answer", "action_input": "your complete answer"}}

## Important:
- Think step by step about what tool to use.
- After using a tool, you will see the result and can decide next steps.
- If web_search fails, try search_knowledge_base or rephrase your query.
- Always provide a final_answer when you have enough information.
- Do NOT include any text before or after the JSON object.
"""


class ReActAgent:
    """
    Async ReAct (Reasoning + Acting) Agent.

    Implements a reasoning loop that:
    1. Thinks about the next step
    2. Executes tools as needed
    3. Observes results
    4. Repeats until final answer or max steps
    """

    MAX_STEPS = 5
    MODEL = "llama-3.3-70b-versatile"

    def __init__(self, user_id: str):
        """
        Initialize ReActAgent for a specific user.

        Args:
            user_id: User ID for knowledge base queries
        """
        if not user_id:
            raise ValueError("user_id is required")

        self.user_id = user_id
        self.client = AsyncGroq()
        self.execution_trace: List[Dict[str, Any]] = []

        logger.info(f"[REACT_AGENT] Initialized for user: {user_id}")

    async def run(
        self,
        user_query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> AgentResponse:
        """
        Execute the ReAct loop for a user query.

        Args:
            user_query: The user's question or request
            conversation_history: Optional previous messages

        Returns:
            AgentResponse with the result
        """
        if not user_query:
            return AgentResponse(
                response_text="Please provide a query.", status="error"
            )

        logger.info(f"[REACT_AGENT] Starting run for: {user_query[:100]}...")
        
        if "tagzzs" in user_query.lower():
            messages =[
                {
                    "role": "system",
                    "content": TAGZZS_SYSTEM_CONTEXT.strip(),
                },               
                {    
                    "role":"user",
                    "content": user_query
                },
            ]

            reponse = await self._call_llm(messages)
            return AgentResponse(
                response_text=reponse or "Tagzzs is an AI-powered personal knowledge system.",
                status="completed",
            )

            
        messages = self._build_messages(user_query, conversation_history or [])
        self.execution_trace = []
        sources: List[Dict[str, str]] = []
        referenced_content: List[Dict[str, Any]] = []

        try:
            for step in range(self.MAX_STEPS):
                logger.info(f"[REACT_AGENT] Step {step + 1}/{self.MAX_STEPS}")

                response = await self._call_llm(messages)

                if not response:
                    return AgentResponse(
                        response_text="Failed to get response from LLM.", status="error"
                    )

                action_data = self._parse_action(response)

                if not action_data:
                    messages.append({"role": "assistant", "content": response})
                    messages.append(
                        {
                            "role": "user",
                            "content": 'Please respond with a valid JSON object: {"action": "...", "action_input": "..."}',
                        }
                    )
                    continue

                action = action_data.get("action", "")
                action_input = action_data.get("action_input", "")

                self.execution_trace.append(
                    {
                        "step": step + 1,
                        "action": action,
                        "input": action_input[:200]
                        if isinstance(action_input, str)
                        else str(action_input)[:200],
                    }
                )

                if action == "final_answer":
                    logger.info("[REACT_AGENT] Got final answer")
                    return AgentResponse(
                        response_text=str(action_input),
                        sources=sources,
                        referenced_content=referenced_content,
                        status="completed",
                    )

                tool_result = await self._execute_tool(action, action_input)

                if (
                    isinstance(tool_result, dict)
                    and tool_result.get("status") == "permission_required"
                ):
                    return AgentResponse(
                        response_text=tool_result.get("reason", "Permission required."),
                        status="needs_permission",
                        ui_component={
                            "type": "permission_button",
                            "action": tool_result.get("action", "web_search"),
                            "query": tool_result.get("query", str(action_input)),
                            "button_text": tool_result.get(
                                "button_text", "Allow Web Search"
                            ),
                        },
                    )

                if action == "web_search":
                    sources.append({"type": "web_search", "query": str(action_input)})
                elif action == "search_knowledge_base":
                    sources.append(
                        {"type": "knowledge_base", "query": str(action_input)}
                    )
                    if (
                        isinstance(tool_result, dict)
                        and "content_references" in tool_result
                    ):
                        referenced_content.extend(
                            tool_result.get("content_references", [])
                        )
                        tool_result = tool_result.get("text", str(tool_result))

                messages.append({"role": "assistant", "content": response})
                messages.append(
                    {"role": "user", "content": f"Observation: {tool_result}"}
                )

                logger.info(
                    f"[REACT_AGENT] Tool result length: {len(str(tool_result))}"
                )

            logger.warning("[REACT_AGENT] Max steps reached, forcing final answer")
            return AgentResponse(
                response_text="I tried but got stuck. Please try rephrasing your question.",
                sources=sources,
                status="error",
            )

        except Exception as e:
            logger.error(f"[REACT_AGENT] Error during run: {str(e)}")
            return AgentResponse(
                response_text=f"An error occurred: {str(e)}", status="error"
            )

    def _build_messages(
        self, user_query: str, conversation_history: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """Build the message list for the LLM."""
        messages = [
            {
                "role": "system",
                "content": TAGZZS_SYSTEM_CONTEXT.strip(),
            },
            {
                "role": "system",
                "content": SYSTEM_PROMPT.format(
                    tool_descriptions=Tools.get_tool_descriptions()
                ),
            },
        ]

        for msg in conversation_history[-10:]:
            messages.append(
                {"role": msg.get("role", "user"), "content": msg.get("content", "")}
            )
        messages.append({"role": "user", "content": f"User query: {user_query}"})

        return messages

    async def _call_llm(self, messages: List[Dict[str, str]]) -> Optional[str]:
        """Call the Groq LLM asynchronously."""
        try:
            completion = await self.client.chat.completions.create(
                model=self.MODEL, messages=messages, temperature=0.7, max_tokens=1024
            )

            if completion.choices and len(completion.choices) > 0:
                return completion.choices[0].message.content

            return None

        except Exception as e:
            logger.error(f"[REACT_AGENT] LLM call failed: {str(e)}")
            return None

    def _parse_action(self, response: str) -> Optional[Dict[str, Any]]:
        """
        Parse action from LLM response with JSON repair.

        Handles:
        - Clean JSON
        - JSON wrapped in markdown code blocks
        - JSON with extra text before/after
        """
        if not response:
            return None

        try:
            return json.loads(response.strip())
        except json.JSONDecodeError:
            pass

        cleaned = response.strip()

        code_block_patterns = [
            r"```json\s*(.*?)\s*```",
            r"```\s*(.*?)\s*```",
        ]

        for pattern in code_block_patterns:
            match = re.search(pattern, cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1).strip())
                except json.JSONDecodeError:
                    continue

        json_match = re.search(r'\{[^{}]*"action"[^{}]*"action_input"[^{}]*\}', cleaned)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        json_match = re.search(r"\{.*?\}", cleaned, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        logger.warning(f"[REACT_AGENT] Failed to parse JSON from: {response[:200]}...")
        return None

    async def _execute_tool(self, action: str, action_input: Any) -> Any:
        """
        Execute a tool with error handling.

        Args:
            action: Tool name
            action_input: Tool input value

        Returns:
            Tool result or error message
        """
        try:
            if action == "web_search":
                return await Tools.web_search(str(action_input))

            elif action == "search_knowledge_base":
                return await Tools.search_knowledge_base(
                    query=str(action_input), user_id=self.user_id
                )

            elif action == "ask_user_permission":
                return await Tools.ask_user_permission(str(action_input))

            else:
                return f"Unknown tool: {action}. Available tools: web_search, search_knowledge_base, ask_user_permission, final_answer"

        except Exception as e:
            logger.error(f"[REACT_AGENT] Tool execution failed: {action} - {str(e)}")
            return f"Error: Tool '{action}' failed. {str(e)}"

    def get_execution_trace(self) -> List[Dict[str, Any]]:
        """Get the execution trace for debugging."""
        return self.execution_trace
