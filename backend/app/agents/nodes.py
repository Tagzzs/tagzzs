"""
LangGraph Agent Nodes

Implements the agent nodes for autonomous task routing and execution:
0. AdaptiveRouter - Dynamic query complexity & execution path selection (NEW)
1. TaskRouter - Classify query intent
2. ContentRetrieval - Get relevant content
3. Summarization - Summarize multiple items
4. Analysis - Extract patterns
5. Comparison - Compare features
6. InsightExtraction - Find key insights
7. MetadataQuery - Filter metadata
8. ResponseGeneration - Generate response
9. Validation - Validate answer quality
"""

import logging
from typing import Dict

from .state import AgentState
from .adaptive_router import AdaptiveRouter
from app.services.ai.semantic_enrichment import get_semantic_service
from app.clients import ChromaClient, EmbeddingClient, LLMClient
from app.clients.comprehensive_search import ComprehensiveSearchEngine
from app.utils.metadata_processor import MetadataProcessor

logger = logging.getLogger(__name__)


class AgentNodes:
    """Container for all agent nodes."""

    def __init__(self, user_id: str):
        """Initialize nodes with clients."""
        self.user_id = user_id
        self.chroma_client = ChromaClient(user_id)
        self.embedding_client = EmbeddingClient()
        self.llm_client = LLMClient()
        self.metadata_processor = MetadataProcessor()
        self.adaptive_router = AdaptiveRouter(self.llm_client)
        self.comprehensive_search = ComprehensiveSearchEngine(user_id)
        self.semantic_service = get_semantic_service(self.llm_client)

    # ============================================================================
    # NODE 0: ADAPTIVE ROUTER (NEW - Dynamic routing & complexity detection)
    # ============================================================================

    def adaptive_route(self, state: AgentState) -> AgentState:
        """
        Intelligently classify query complexity and select optimal execution path.

        This node runs BEFORE task_router to inform downstream routing.
        Evaluates:
        - Query complexity (SIMPLE, ANALYTICAL, SYNTHESIS, REAL_TIME)
        - Optimal execution path (FAST_PATH, ANALYTICAL_PATH, SYNTHESIS_PATH, METADATA_PATH)
        - Web search need, parallelization hints, refinement requirements
        """
        try:
            state.add_execution_step("AdaptiveRoute", "in_progress")

            logger.info(f"[ADAPTIVE_ROUTE] Analyzing query: {state.query[:80]}...")

            # Classify query using adaptive router
            classification = self.adaptive_router.classify_query(state.query)

            # Extract and store classification in state
            state.query_complexity = classification.get("complexity")
            state.task_type = classification.get(
                "task_type"
            )  # May override heuristic task_type
            state.task_confidence = classification.get("confidence", 0.6)
            state.use_web_search = classification.get("use_web_search", False)
            state.require_refinement = classification.get("require_refinement", False)

            # Get execution strategy
            state.execution_path = classification.get("execution_path")
            state.execution_strategy = self.adaptive_router.get_execution_strategy(
                classification
            )

            logger.info(
                f"[ADAPTIVE_ROUTE] Classification complete:\n"
                f"  Complexity: {state.query_complexity}\n"
                f"  Task: {state.task_type}\n"
                f"  Path: {state.execution_path}\n"
                f"  Confidence: {state.task_confidence:.2f}\n"
                f"  Web Search: {state.use_web_search}\n"
                f"  Refinement: {state.require_refinement}\n"
                f"  Strategy: {state.execution_strategy.get('rationale')}"
            )

            state.add_execution_step("AdaptiveRoute", "completed")
            return state

        except Exception as e:
            logger.error(f"[ADAPTIVE_ROUTE] Error: {str(e)}")
            state.set_error(f"AdaptiveRoute failed: {str(e)}")
            state.add_execution_step("AdaptiveRoute", "failed")
            return state

    # ============================================================================
    # NODE 1: TASK ROUTER
    # ============================================================================

    def task_router(self, state: AgentState) -> AgentState:
        """
        Classify query intent into task types.

        Detects: SEARCH, SUMMARIZE, ANALYZE, COMPARE, EXTRACT_INSIGHTS, METADATA_QUERY
        """
        try:
            state.add_execution_step("TaskRouter", "in_progress")

            query_lower = state.query.lower()
            task_type = "SEARCH"  # default
            confidence = 0.5

            # Keyword-based detection
            if any(
                word in query_lower for word in ["summarize", "summary", "overview"]
            ):
                task_type = "SUMMARIZE"
                confidence = 0.9
            elif any(
                word in query_lower for word in ["compare", "difference", "similar"]
            ):
                task_type = "COMPARE"
                confidence = 0.9
            elif any(
                word in query_lower
                for word in ["analyze", "analysis", "pattern", "insight"]
            ):
                task_type = "ANALYZE"
                confidence = 0.85
            elif any(
                word in query_lower for word in ["extract", "find", "discover", "trend"]
            ):
                task_type = "EXTRACT_INSIGHTS"
                confidence = 0.8
            elif any(
                word in query_lower
                for word in ["list", "count", "all", "show", "get", "filter"]
            ) and any(
                word in query_lower for word in ["tag", "type", "source", "pdf", "web"]
            ):
                task_type = "METADATA_QUERY"
                confidence = 0.85

            state.task_type = task_type
            state.task_confidence = confidence
            state.add_execution_step("TaskRouter", "completed")

            logger.info(f"Task classified: {task_type} (confidence: {confidence:.2f})")
            return state

        except Exception as e:
            logger.error(f"Error in TaskRouter: {str(e)}")
            state.set_error(f"TaskRouter failed: {str(e)}")
            state.add_execution_step("TaskRouter", "failed")
            return state

    # ============================================================================
    # NODE 2: CONTENT RETRIEVAL (ENHANCED - Multi-field comprehensive search)
    # ============================================================================

    def content_retrieval(self, state: AgentState) -> AgentState:
        """
        Retrieve relevant content using comprehensive multi-field search.
        Enhanced with semantic understanding to match content based on properties,
        not just literal keywords.

        Searches across:
        - Title (highest weight: 1.0)
        - Description (weight: 0.9)
        - Personal notes (weight: 0.8)
        - Raw data/full content (weight: 0.7)

        Returns ranked results based on field relevance + semantic similarity.
        """
        try:
            state.add_execution_step("ContentRetrieval", "in_progress")

            # Analyze query intent for semantic understanding
            query_intent = self.semantic_service.analyze_query_intent(state.query)
            state.query_intent = query_intent

            logger.info(
                f"[CONTENT_RETRIEVAL] Query intent: type={query_intent.intent_type}, "
                f"target_properties={query_intent.target_properties}, "
                f"target_entities={query_intent.target_entities}"
            )

            # Generate query embedding
            embedding = self.embedding_client.embed_query(state.query)
            state.query_embedding = embedding

            logger.info(
                f"[CONTENT_RETRIEVAL] Starting comprehensive multi-field search: {state.query[:100]}..."
            )

            # Use comprehensive search engine for multi-field retrieval (8 top results)
            try:
                comprehensive_results = self.comprehensive_search.comprehensive_search(
                    query_embedding=embedding,
                    query_text=state.query,
                    top_k=10,  # Get more results for better diversity
                    where_filter=None,
                )

                logger.info(
                    f"[CONTENT_RETRIEVAL] Comprehensive search returned {len(comprehensive_results)} results"
                )
            except Exception as search_error:
                logger.warning(
                    f"[CONTENT_RETRIEVAL] Comprehensive search failed: {str(search_error)}, falling back to basic search"
                )
                # Fallback to basic search if comprehensive search fails
                basic_chunks = self.chroma_client.search_chunks(embedding, top_k=8)
                comprehensive_results = []
                for chunk in basic_chunks:
                    from clients.comprehensive_search import SearchResult

                    result = SearchResult(
                        content=chunk.get("content", ""),
                        metadata=chunk.get("metadata", {}),
                        source_field=chunk.get("metadata", {}).get(
                            "source_field", "raw_data"
                        ),
                        relevance_score=chunk.get("metadata", {}).get(
                            "relevance_score", 0.7
                        ),
                        field_weight=chunk.get("metadata", {}).get("field_weight", 0.6),
                        content_id=chunk.get("metadata", {}).get("content_id"),
                        source_type=chunk.get("metadata", {}).get("source_type"),
                    )
                    comprehensive_results.append(result)

            # SEMANTIC RE-RANKING: Apply semantic matching to improve relevance
            # This is the key improvement that solves the problem
            semantic_scored_results = []
            for result in comprehensive_results:
                # Calculate semantic match score
                semantic_score = self.semantic_service.match_content_to_intent(
                    result.content, query_intent
                )

                # Combine vector relevance with semantic relevance (50/50 blend)
                # Higher weight on semantic for property-based queries
                if query_intent.intent_type == "boolean_query":
                    combined_score = result.relevance_score * 0.3 + semantic_score * 0.7
                else:
                    combined_score = result.relevance_score * 0.5 + semantic_score * 0.5

                result.semantic_match_score = semantic_score
                result.combined_relevance = combined_score
                semantic_scored_results.append(result)

            # Re-rank by combined score
            semantic_scored_results.sort(
                key=lambda r: r.combined_relevance, reverse=True
            )

            logger.info("[CONTENT_RETRIEVAL] Semantic re-ranking applied. Top scores:")
            for i, result in enumerate(semantic_scored_results[:3], 1):
                logger.info(
                    f"  {i}. semantic={result.semantic_match_score:.3f}, "
                    f"combined={result.combined_relevance:.3f}, "
                    f"preview={result.content[:50]}..."
                )

            # Convert SearchResult objects to chunk format for downstream compatibility
            retrieved_chunks = []
            for result in semantic_scored_results:
                chunk_dict = {
                    "content": result.content,
                    "metadata": {
                        **result.metadata,
                        "source_field": result.source_field,
                        "relevance_score": result.combined_relevance,  # Use combined semantic score
                        "field_weight": result.field_weight,
                        "similarity_distance": result.similarity_distance,
                        "content_id": result.content_id,
                        "source_type": result.source_type,
                        "semantic_score": result.semantic_match_score,
                    },
                    "distance": result.similarity_distance,
                    "relevance_score": result.combined_relevance,
                }
                retrieved_chunks.append(chunk_dict)

            state.retrieved_chunks = retrieved_chunks

            # Also retrieve summaries for overview
            summaries = self.chroma_client.search_summaries(embedding, top_k=3)
            state.retrieved_summaries = summaries

            # Log retrieval details with field distribution
            logger.info(
                f"[CONTENT_RETRIEVAL] Retrieved {len(retrieved_chunks)} results with field distribution:"
            )
            field_counts = {}
            for chunk in retrieved_chunks:
                field = chunk["metadata"].get("source_field", "unknown")
                field_counts[field] = field_counts.get(field, 0) + 1
            for field, count in field_counts.items():
                logger.info(f"  {field}: {count}")

            if retrieved_chunks:
                for i, chunk in enumerate(retrieved_chunks[:3], 1):
                    logger.info(
                        f"  Result {i}: field={chunk['metadata'].get('source_field', 'unknown')}, "
                        f"relevance={chunk['metadata'].get('relevance_score', 0):.3f}, "
                        f"semantic={chunk['metadata'].get('semantic_score', 0):.3f}, "
                        f"preview={chunk['content'][:60]}..."
                    )

            state.add_execution_step("ContentRetrieval", "completed")

            return state

        except Exception as e:
            logger.error(f"Error in ContentRetrieval: {str(e)}", exc_info=True)
            state.set_error(f"ContentRetrieval failed: {str(e)}")
            state.add_execution_step("ContentRetrieval", "failed")
            return state

    # ============================================================================
    # NODE 3: SUMMARIZATION
    # ============================================================================

    def summarization(self, state: AgentState) -> AgentState:
        """Summarize retrieved content with enhanced clarity and structure."""
        try:
            state.add_execution_step("Summarization", "in_progress")

            if not state.retrieved_chunks:
                state.add_execution_step("Summarization", "skipped")
                return state

            # Group by content ID and title
            groups = {}
            for chunk in state.retrieved_chunks:
                content_id = chunk.get("metadata", {}).get("content_id", "unknown")
                title = chunk.get("metadata", {}).get("title", "Untitled")
                if content_id not in groups:
                    groups[content_id] = {"chunks": [], "title": title}
                groups[content_id]["chunks"].append(chunk["content"])

            # Summarize each group with enhanced prompting
            summaries = {}
            for content_id, group_data in groups.items():
                chunks_list = group_data["chunks"]
                title = group_data["title"]
                combined = " ".join(chunks_list)

                # Enhanced prompt for better clarity and structured output (plain text, not markdown)
                prompt = f"""Please summarize the following content from '{title}' in a clear, well-structured format.

Content to summarize:
{combined[:1000]}

Provide the summary with these sections (use plain text formatting, no markdown):

MAIN TOPIC:
Brief statement of the core subject

KEY POINTS:
- Important point 1
- Important point 2
- Important point 3
(3-5 points total)

RELEVANCE:
One sentence about why this is significant

Keep it concise and factual. Focus on clarity and helping the reader understand quickly."""

                summary = self.llm_client.call_llm(
                    prompt,
                    system_prompt="""You are an expert summarizer creating clear, structured summaries.

Guidelines:
- Use plain text with clear section headings
- Use bullet points (- or •) for key information
- Put the most important facts first
- Be factual without meta-commentary
- Focus on what users need to know
- Do NOT use markdown formatting (no ** for bold, no ## for headers)
- Use UPPERCASE for section titles to make them stand out
- Provide context alongside facts
- Make content scannable and easy to understand
- Format for readability without markdown""",
                )
                summaries[content_id] = {
                    "title": title,
                    "summary": summary,
                    "content_id": content_id,
                }

            state.intermediate_results["summaries"] = summaries
            state.add_execution_step("Summarization", "completed")
            logger.info(
                f"Summarized {len(summaries)} content groups with enhanced formatting"
            )

            return state

        except Exception as e:
            logger.error(f"Error in Summarization: {str(e)}")
            state.set_error(f"Summarization failed: {str(e)}")
            state.add_execution_step("Summarization", "failed")
            return state

    # ============================================================================
    # NODE 4: ANALYSIS
    # ============================================================================

    def analysis(self, state: AgentState) -> AgentState:
        """Analyze patterns in retrieved content."""
        try:
            state.add_execution_step("Analysis", "in_progress")

            if not state.retrieved_chunks:
                state.add_execution_step("Analysis", "skipped")
                return state

            # Combine content
            all_content = " ".join([c["content"][:300] for c in state.retrieved_chunks])

            prompt = f"""Analyze the following content and identify:
1. Key patterns or themes
2. Important concepts or entities
3. Notable relationships or connections

Content:
{all_content}

Provide structured analysis."""

            analysis = self.llm_client.call_llm(
                prompt,
                system_prompt="You are an expert analyst. Provide deep, insightful analysis.",
            )

            state.analysis_results["patterns"] = analysis
            state.add_execution_step("Analysis", "completed")

            return state

        except Exception as e:
            logger.error(f"Error in Analysis: {str(e)}")
            state.set_error(f"Analysis failed: {str(e)}")
            state.add_execution_step("Analysis", "failed")
            return state

    # ============================================================================
    # NODE 5: COMPARISON
    # ============================================================================

    def comparison(self, state: AgentState) -> AgentState:
        """Compare retrieved items."""
        try:
            state.add_execution_step("Comparison", "in_progress")

            if not state.retrieved_chunks or len(state.retrieved_chunks) < 2:
                state.add_execution_step("Comparison", "skipped")
                return state

            # Extract items to compare
            items = [c["content"][:200] for c in state.retrieved_chunks[:5]]

            prompt = f"""Compare these items and highlight:
1. Similarities
2. Differences
3. Advantages/Disadvantages

Items:
{chr(10).join([f"{i + 1}. {item}" for i, item in enumerate(items)])}

Provide a clear comparison."""

            comparison = self.llm_client.call_llm(
                prompt, system_prompt="You are an expert at making clear comparisons."
            )

            state.analysis_results["comparison"] = comparison
            state.add_execution_step("Comparison", "completed")

            return state

        except Exception as e:
            logger.error(f"Error in Comparison: {str(e)}")
            state.set_error(f"Comparison failed: {str(e)}")
            state.add_execution_step("Comparison", "failed")
            return state

    # ============================================================================
    # NODE 6: INSIGHT EXTRACTION
    # ============================================================================

    def insight_extraction(self, state: AgentState) -> AgentState:
        """Extract key insights from large content volumes."""
        try:
            state.add_execution_step("InsightExtraction", "in_progress")

            if not state.retrieved_chunks:
                state.add_execution_step("InsightExtraction", "skipped")
                return state

            # Combine all content
            all_content = " ".join([c["content"][:200] for c in state.retrieved_chunks])

            prompt = f"""From the following content, extract:
1. Top 3 key insights
2. Actionable takeaways
3. Future implications

Content:
{all_content[:1000]}

Be specific and actionable."""

            insights = self.llm_client.call_llm(
                prompt,
                system_prompt="You are an expert at extracting actionable insights.",
            )

            state.analysis_results["insights"] = insights
            state.add_execution_step("InsightExtraction", "completed")

            return state

        except Exception as e:
            logger.error(f"Error in InsightExtraction: {str(e)}")
            state.set_error(f"InsightExtraction failed: {str(e)}")
            state.add_execution_step("InsightExtraction", "failed")
            return state

    # ============================================================================
    # NODE 7: METADATA QUERY
    # ============================================================================

    def metadata_query(self, state: AgentState) -> AgentState:
        """Query using metadata filters only (no embeddings)."""
        try:
            state.add_execution_step("MetadataQuery", "in_progress")

            # Parse query intent
            intent = self.metadata_processor.parse_query_intent(state.query)
            filters = intent["filters"]
            query_type = intent.get("query_type", "metadata_filter")

            logger.info(
                f"[METADATA_QUERY] Query type: {query_type}, Intent: {intent['action']}"
            )

            # Handle "list all tags" query
            if query_type == "list_tags":
                logger.info("[METADATA_QUERY] Processing 'list_tags' query")
                try:
                    # Get all unique tags from user's database
                    all_tags = self.chroma_client.get_all_unique_tags()

                    if all_tags:
                        # Format tags as a nice list
                        ", ".join(all_tags)
                        state.intermediate_results["metadata_results"] = {
                            "tag_count": len(all_tags),
                            "tags": all_tags,
                            "formatted": f"Found {len(all_tags)} unique tags in your content:\n\n• "
                            + "\n• ".join(all_tags),
                        }
                        logger.info(
                            f"[METADATA_QUERY] Found {len(all_tags)} unique tags"
                        )
                    else:
                        state.intermediate_results["metadata_results"] = {
                            "tag_count": 0,
                            "tags": [],
                            "formatted": "No tags found in your content yet. Start by tagging your content!",
                        }
                        logger.info("[METADATA_QUERY] No tags found in user's database")

                    state.add_execution_step("MetadataQuery", "completed")
                    return state

                except Exception as e:
                    logger.error(
                        f"[METADATA_QUERY] Error getting all tags: {str(e)}",
                        exc_info=True,
                    )
                    state.set_error(f"Failed to retrieve tags: {str(e)}")
                    state.add_execution_step("MetadataQuery", "failed")
                    return state

            # Original metadata filter logic for other query types
            if not filters:
                state.add_execution_step("MetadataQuery", "skipped")
                return state

            # Build where clause
            where_clause = self.metadata_processor.build_where_clause(filters)

            # Query by metadata
            results = self.chroma_client.filter_by_metadata(where_clause or {})

            # Format results
            formatted = self.metadata_processor.format_results(results)

            # Aggregate if requested
            if intent["action"] == "count":
                count = len(formatted)
                state.intermediate_results["metadata_results"] = f"Found {count} items"
            elif intent["action"] == "group":
                # Group results
                aggregated = self.metadata_processor.aggregate_metadata(
                    results, group_by="source_type", count=True
                )
                state.intermediate_results["metadata_results"] = aggregated
            else:
                state.intermediate_results["metadata_results"] = formatted

            state.add_execution_step("MetadataQuery", "completed")
            logger.info(f"Metadata query found {len(formatted)} results")

            return state

        except Exception as e:
            logger.error(f"Error in MetadataQuery: {str(e)}")
            state.set_error(f"MetadataQuery failed: {str(e)}")
            state.add_execution_step("MetadataQuery", "failed")
            return state

    # ============================================================================
    # NODE 8: RESPONSE GENERATION (ENHANCED - Multi-field context)
    # ============================================================================

    def response_generation(self, state: AgentState) -> AgentState:
        """
        Generate final response based on task type and comprehensive content analysis.

        Features:
        - Includes source field context (title, description, personal notes, etc.)
        - Provides elaborative or concise answers based on query complexity
        - Preserves answer source attribution
        """
        try:
            state.add_execution_step("ResponseGeneration", "in_progress")

            task_type = state.task_type or "SEARCH"

            # CONVERSATION: Direct response without retrieval (greetings, small talk)
            if task_type == "CONVERSATION":
                query_lower = state.query.lower()

                # Greeting responses
                if any(
                    word in query_lower for word in ["hello", "hi", "hey", "greetings"]
                ):
                    final_answer = "👋 Hello! I'm Kai AI, your intelligent content assistant. How can I help you with your documents today?"

                elif any(
                    word in query_lower
                    for word in ["how are you", "what's up", "how are you doing"]
                ):
                    final_answer = "I'm doing great, thanks for asking! 😊 I'm here to help you search, analyze, and extract insights from your content. What would you like to know?"

                elif any(
                    word in query_lower for word in ["thank", "thanks", "appreciate"]
                ):
                    final_answer = (
                        "You're welcome! 😊 Is there anything else I can help you with?"
                    )

                elif any(
                    word in query_lower
                    for word in ["what are you", "who are you", "your name"]
                ):
                    final_answer = "I'm Kai AI, an intelligent content analysis assistant. I can help you with searching, summarizing, analyzing, and extracting insights from your documents. What would you like to explore?"

                elif any(
                    word in query_lower
                    for word in ["what can you do", "how can you help", "capabilities"]
                ):
                    final_answer = """I can help you with:
- 🔍 **Search**: Find specific information in your documents
- 📝 **Summarize**: Get concise summaries of content
- 🔬 **Analyze**: Identify patterns and trends
- 🔄 **Compare**: Compare different topics or items
- 💡 **Extract Insights**: Discover key takeaways
- 🏷️ **Filter**: Use metadata to find what you need

Just ask me anything about your content!"""

                else:
                    # Generic conversational response
                    final_answer = "That's interesting! While I'm primarily designed to help with content analysis, I'd be happy to assist with any questions about your documents. What would you like to know?"

            # Select template based on task type
            elif task_type == "SUMMARIZE":
                summaries = state.intermediate_results.get("summaries", {})

                if not summaries:
                    final_answer = "No content available to summarize."
                else:
                    # Format summaries with clear structure (plain text, no markdown)
                    summary_parts = []
                    summary_parts.append(
                        f"SUMMARY RESULTS ({len(summaries)} item{'s' if len(summaries) != 1 else ''})\n"
                    )
                    summary_parts.append("=" * 50)

                    for idx, (content_id, summary_data) in enumerate(
                        summaries.items(), 1
                    ):
                        if isinstance(summary_data, dict):
                            title = summary_data.get("title", "Untitled")
                            summary_text = summary_data.get("summary", "")
                        else:
                            title = "Content"
                            summary_text = str(summary_data)

                        # Format with clear separation (plain text)
                        summary_parts.append(f"\n{idx}. {title}")
                        summary_parts.append("-" * 40)
                        summary_parts.append(summary_text)

                    summary_parts.append(f"\n{'=' * 50}")
                    final_answer = "\n".join(summary_parts)

            elif task_type == "ANALYZE":
                patterns = state.analysis_results.get("patterns", "No patterns found")
                analysis = state.analysis_results.get("detailed_analysis", "")

                analysis_parts = ["ANALYSIS RESULTS\n"]
                analysis_parts.append("=" * 40)

                if patterns and patterns != "No patterns found":
                    analysis_parts.append("\nPATTERNS IDENTIFIED:\n")
                    analysis_parts.append(str(patterns))

                if analysis:
                    analysis_parts.append("\nDETAILED ANALYSIS:\n")
                    analysis_parts.append(str(analysis))

                final_answer = (
                    "\n".join(analysis_parts)
                    if analysis_parts
                    else "No analysis available"
                )

            elif task_type == "COMPARE":
                comparison = state.analysis_results.get(
                    "comparison", "No comparison available"
                )
                insights = state.analysis_results.get("comparison_insights", "")

                compare_parts = ["COMPARISON RESULTS\n"]
                compare_parts.append("=" * 40)

                if comparison and comparison != "No comparison available":
                    compare_parts.append("\nCOMPARISON:\n")
                    compare_parts.append(str(comparison))

                if insights:
                    compare_parts.append("\nKEY INSIGHTS:\n")
                    compare_parts.append(str(insights))

                final_answer = (
                    "\n".join(compare_parts)
                    if compare_parts
                    else "No comparison available"
                )

            elif task_type == "EXTRACT_INSIGHTS":
                insights = state.analysis_results.get("insights", "No insights found")
                extracted_data = state.analysis_results.get("extracted_data", "")

                insight_parts = ["KEY INSIGHTS\n"]
                insight_parts.append("=" * 40)

                if insights and insights != "No insights found":
                    insight_parts.append("\nMAIN INSIGHTS:\n")
                    insight_parts.append(str(insights))

                if extracted_data:
                    insight_parts.append("\nEXTRACTED DATA:\n")
                    insight_parts.append(str(extracted_data))

                final_answer = (
                    "\n".join(insight_parts)
                    if insight_parts
                    else "No insights available"
                )

            elif task_type == "METADATA_QUERY":
                metadata_results = state.intermediate_results.get(
                    "metadata_results", {}
                )

                # Handle different result formats (plain text, no markdown)
                if isinstance(metadata_results, dict):
                    if "formatted" in metadata_results:
                        # Pre-formatted results from service
                        final_answer = metadata_results["formatted"]
                    elif "results" in metadata_results:
                        # Structured results
                        results_list = metadata_results["results"]
                        result_parts = ["QUERY RESULTS\n"]
                        result_parts.append("=" * 40)

                        if isinstance(results_list, list) and results_list:
                            for idx, item in enumerate(results_list, 1):
                                if isinstance(item, dict):
                                    result_parts.append(
                                        f"\n{idx}. {item.get('name', 'Item ' + str(idx))}"
                                    )
                                    if "description" in item:
                                        result_parts.append(f"   {item['description']}")
                                    if "count" in item:
                                        result_parts.append(
                                            f"   Count: {item['count']}"
                                        )
                                else:
                                    result_parts.append(f"{idx}. {str(item)}")
                            final_answer = "\n".join(result_parts)
                        else:
                            final_answer = str(metadata_results)
                    else:
                        # Generic dict formatting (plain text, no markdown)
                        result_parts = ["QUERY RESULTS\n"]
                        result_parts.append("=" * 40)
                        for key, value in metadata_results.items():
                            result_parts.append(f"{key}: {value}")
                        final_answer = "\n".join(result_parts)
                elif isinstance(metadata_results, list):
                    # List of results (plain text)
                    result_parts = ["QUERY RESULTS\n"]
                    result_parts.append("=" * 40)
                    for idx, item in enumerate(metadata_results, 1):
                        result_parts.append(f"{idx}. {str(item)}")
                    final_answer = "\n".join(result_parts)
                else:
                    # Fallback for other formats (plain text)
                    final_answer = f"QUERY RESULTS\n{'=' * 40}\n{str(metadata_results)}"

            else:  # SEARCH - Enhanced with field context and semantic understanding
                chunks = state.retrieved_chunks

                if not chunks:
                    final_answer = "No relevant information found."
                else:
                    # Organize content by field for better context
                    field_grouped = self._organize_by_field(chunks[:8])

                    # Build rich context for LLM with detailed field information
                    context_parts = []
                    context_parts.append(f"**Query:** {state.query}\n")
                    field_order = [
                        "title",
                        "description",
                        "personal_notes",
                        "raw_data",
                        "chunks",
                        "summary",
                    ]

                    for field in field_order:
                        if field in field_grouped and field_grouped[field]:
                            context_parts.append(
                                f"\n**{self._format_field_name(field)}:**"
                            )
                            # Include more content and relevance info
                            for idx, item in enumerate(field_grouped[field][:3], 1):
                                content_preview = item.get("content", "")[:400]
                                relevance = item.get("metadata", {}).get(
                                    "relevance_score", 0
                                )
                                semantic_score = item.get("metadata", {}).get(
                                    "semantic_score", 0
                                )
                                context_parts.append(
                                    f"{idx}. [Relevance: {relevance:.0%}, Semantic Match: {semantic_score:.0%}] {content_preview}"
                                )

                    content_context = "\n".join(context_parts)

                    # Add semantic enrichment context to help LLM understand relationships
                    semantic_context = ""
                    entities_in_content = []
                    if hasattr(state, "query_intent") and state.query_intent:
                        entities_in_content = []
                        for chunk in chunks:
                            entities = self.semantic_service.extract_semantic_entities(
                                chunk.get("content", "")
                            )
                            entities_in_content.extend(entities)

                        if entities_in_content:
                            semantic_context = (
                                self.semantic_service.enrich_response_context(
                                    state.query,
                                    "\n".join([c.get("content", "") for c in chunks]),
                                    state.query_intent,
                                    entities_in_content,
                                )
                            )

                    # Determine answer style based on query complexity
                    query_length = len(state.query.split())
                    is_complex = (
                        state.query_complexity in ["ANALYTICAL", "SYNTHESIS"]
                        or query_length > 10
                    )

                    # Build prompt with field awareness and semantic context
                    if is_complex:
                        prompt = f"""You are an expert researcher providing accurate, comprehensive answers from provided content.

{semantic_context}

{content_context}

INSTRUCTIONS:
1. Analyze all provided sources carefully, prioritizing TITLE and DESCRIPTION fields (highest reliability)
2. Provide a thorough, well-structured answer using insights from multiple sources
3. Always cite which type of source you're referencing (Title, Description, Notes, Content)
4. Use the entity information to make semantic connections
5. Highlight connections and patterns across different sources
6. Be specific and factual - quote directly when relevant
7. If information conflicts, acknowledge it and explain the discrepancy
8. Organize your answer with clear sections and bullet points for readability
9. Do NOT mention the sources or the task - just provide the answer

Generate a comprehensive answer that directly addresses the query."""
                    else:
                        prompt = f"""You are an expert at providing concise, accurate answers from content.

{semantic_context}

{content_context}

INSTRUCTIONS:
1. Provide a direct, clear answer to the query
2. Prioritize TITLE and DESCRIPTION information (most reliable)
3. Keep response brief and to the point
4. Only include relevant facts needed to answer the question
5. Use entity properties to answer queries correctly
6. When appropriate, cite your source type (Title/Description/Notes/Content)
7. Organize with clear formatting and bullet points if helpful
8. Do NOT mention sources or explain the retrieval process - just answer the question

Generate a concise answer that directly addresses the query."""

                    logger.info(
                        f"[RESPONSE_GEN] Generating response with field-aware and semantic context (complex={is_complex}, sources={len(chunks)}, semantic_entities={len(entities_in_content) if semantic_context else 0})"
                    )
                    final_answer = self.llm_client.call_llm(
                        prompt,
                        system_prompt="""You are Kai, an expert content analysis AI providing clear, accurate answers grounded in provided content.

Guidelines for your responses:
- Always provide direct answers without meta-commentary
- Never mention that you're analyzing or retrieving content
- Use clear formatting with headings, bullet points, and structure
- Prioritize information from titles and descriptions as they are most reliable
- Understand that entities have properties beyond explicit mentions
- Be thorough for complex questions, concise for simple ones
- Avoid phrases like "Based on the content", "The sources show", or "According to the provided information"
- Just provide the answer clearly and directly
- If you can't answer, simply say "I don't have this information in your saved content"
- Format responses for clarity and easy reading
- DO NOT use markdown formatting (no ** for bold, no ## for headers, no * for emphasis)
- Use plain text only with line breaks, dashes (-), equals (=) for visual separation
- Use UPPERCASE for section titles instead of markdown headers""",
                    )

                    # Add sources section with enhanced information (plain text, no markdown)
                    sources_summary = self._get_sources_summary(chunks[:5])
                    if sources_summary:
                        final_answer += f"\n\nSOURCES: {sources_summary}"

            state.final_answer = final_answer
            state.add_execution_step("ResponseGeneration", "completed")

            return state

        except Exception as e:
            logger.error(f"Error in ResponseGeneration: {str(e)}", exc_info=True)
            state.set_error(f"ResponseGeneration failed: {str(e)}")
            state.add_execution_step("ResponseGeneration", "failed")
            return state

    # ============================================================================
    # HELPER METHODS FOR RESPONSE GENERATION
    # ============================================================================

    def _organize_by_field(self, chunks: list) -> Dict[str, list]:
        """
        Organize retrieved chunks by their source field.

        Args:
            chunks: List of retrieved chunks

        Returns:
            Dictionary organized by field type
        """
        organized = {}
        for chunk in chunks:
            field = chunk.get("metadata", {}).get("source_field", "raw_data")
            if field not in organized:
                organized[field] = []
            organized[field].append(chunk)
        return organized

    def _format_field_name(self, field: str) -> str:
        """Convert field name to readable format."""
        field_names = {
            "title": "📌 Title",
            "description": "📋 Description",
            "personal_notes": "📝 Personal Notes",
            "raw_data": "📄 Content",
            "chunks": "📃 Detailed Content",
            "summary": "✨ Summary",
        }
        return field_names.get(field, field.title())

    def _get_sources_summary(self, chunks: list) -> str:
        """
        Generate a summary of sources used in the answer.

        Args:
            chunks: List of chunks used

        Returns:
            Formatted sources string
        """
        if not chunks:
            return ""

        sources = []
        for chunk in chunks:
            metadata = chunk.get("metadata", {})
            field = metadata.get("source_field", "unknown")
            relevance = metadata.get("relevance_score", 0)

            source_info = f"{field} (relevance: {relevance:.1%})"
            if source_info not in sources:
                sources.append(source_info)

        return " | ".join(sources[:3]) if sources else ""

    # ============================================================================
    # NODE 9: VALIDATION (ENHANCED - Multi-field analysis)
    # ============================================================================

    def validation(self, state: AgentState) -> AgentState:
        """
        Validate answer quality and completeness based on multiple criteria.

        Evaluates:
        - Source coverage (multiple fields used)
        - Content diversity
        - Relevance scores of sources
        - Answer completeness
        """
        try:
            state.add_execution_step("Validation", "in_progress")

            # Start with task confidence
            confidence = state.task_confidence

            logger.info(
                f"[VALIDATION] Starting validation with base confidence: {confidence:.2%}"
            )

            # 1. Check answer completeness and quality
            answer_quality = self._assess_answer_quality(state.final_answer)
            confidence *= answer_quality
            logger.info(f"[VALIDATION] Answer quality: {answer_quality:.2%}")

            # 2. Check source coverage and diversity
            source_coverage = self._assess_source_coverage(state.retrieved_chunks)
            confidence *= source_coverage
            logger.info(f"[VALIDATION] Source coverage: {source_coverage:.2%}")

            # 3. Check relevance of retrieved sources
            relevance_quality = self._assess_relevance_quality(state.retrieved_chunks)
            confidence *= relevance_quality
            logger.info(f"[VALIDATION] Relevance quality: {relevance_quality:.2%}")

            # 4. Check if critical sources were found
            critical_sources = self._has_critical_sources(state.retrieved_chunks)
            if critical_sources:
                confidence = min(confidence * 1.1, 1.0)  # Boost for high-weight sources
                logger.info("[VALIDATION] Critical sources found (title/description)")

            # Ensure score is in valid range
            state.confidence_score = min(max(confidence, 0.0), 1.0)

            # Build detailed reasoning
            state.reasoning = self._build_detailed_reasoning(
                state.task_type,
                state.confidence_score,
                state.retrieved_chunks,
                answer_quality,
            )

            # Set sources used for response
            state.sources_used = self._extract_sources_metadata(state.retrieved_chunks)

            state.add_execution_step("Validation", "completed")
            logger.info(
                f"[VALIDATION] Complete. Confidence: {state.confidence_score:.2%}, "
                f"Sources: {len(state.sources_used)}"
            )

            return state

        except Exception as e:
            logger.error(f"Error in Validation: {str(e)}", exc_info=True)
            state.set_error(f"Validation failed: {str(e)}")
            state.add_execution_step("Validation", "failed")
            return state

    # ============================================================================
    # VALIDATION HELPER METHODS
    # ============================================================================

    def _assess_answer_quality(self, answer: str) -> float:
        """
        Assess the quality of the generated answer.

        Factors:
        - Length (well-developed answers are better)
        - Structure (multiple sentences/paragraphs)
        - Has sources/citations
        - Information density
        """
        if not answer:
            return 0.3

        base_score = 0.65

        # Length factor (longer, well-developed answers)
        word_count = len(answer.split())
        if word_count > 150:
            base_score = 0.95
        elif word_count > 100:
            base_score = 0.88
        elif word_count > 60:
            base_score = 0.78
        elif word_count > 30:
            base_score = 0.70
        else:
            base_score = 0.60

        # Structure factor (multiple paragraphs/sections)
        sentence_count = answer.count(".") + answer.count("!") + answer.count("?")
        if sentence_count > 8:
            base_score = min(base_score * 1.08, 1.0)
        elif sentence_count > 4:
            base_score = min(base_score * 1.05, 1.0)

        # Has sources/citations (strong indicator of grounded answer)
        if "Sources" in answer or "source" in answer.lower() or "[" in answer:
            base_score = min(base_score * 1.08, 1.0)

        # Information density (mentions of specific content)
        mention_count = (
            answer.lower().count("from")
            + answer.lower().count("according")
            + answer.lower().count("state")
            + answer.lower().count("note")
        )
        if mention_count > 2:
            base_score = min(base_score * 1.05, 1.0)

        return min(base_score, 1.0)

    def _assess_source_coverage(self, chunks: list) -> float:
        """
        Assess the diversity and coverage of retrieved sources.

        Factors:
        - Multiple source fields used (title, description, notes preferred)
        - Multiple content_ids represented (not just one source)
        - Relevance diversity (mix of high and medium relevance)
        """
        if not chunks:
            return 0.4  # Low confidence with no sources

        base_score = 0.65

        # Count unique fields
        fields = set()
        content_ids = set()
        relevance_scores = []

        critical_fields = {"title", "description"}  # Most reliable

        for chunk in chunks:
            metadata = chunk.get("metadata", {})
            field = metadata.get("source_field", "unknown")
            fields.add(field)
            content_ids.add(metadata.get("content_id", "unknown"))

            score = metadata.get("relevance_score", 0)
            relevance_scores.append(score)

            if field in critical_fields:
                pass

        # Multiple critical fields boost (title + description is excellent)
        critical_count = len(fields & critical_fields)
        if critical_count == 2:
            base_score = 0.90
        elif critical_count == 1:
            base_score = 0.80

        # Multiple fields boost
        if len(fields) >= 4:
            base_score = min(base_score * 1.12, 1.0)
        elif len(fields) >= 3:
            base_score = min(base_score * 1.10, 1.0)
        elif len(fields) >= 2:
            base_score = min(base_score * 1.08, 1.0)

        # Multiple content sources boost (diversity)
        if len(content_ids) >= 4:
            base_score = min(base_score * 1.12, 1.0)
        elif len(content_ids) >= 3:
            base_score = min(base_score * 1.10, 1.0)
        elif len(content_ids) >= 2:
            base_score = min(base_score * 1.08, 1.0)

        # Relevance diversity (both high and medium scores)
        if relevance_scores:
            avg_relevance = sum(relevance_scores) / len(relevance_scores)
            if 0.7 < avg_relevance < 0.95:  # Good mix
                base_score = min(base_score * 1.05, 1.0)

        logger.debug(
            f"Source coverage: fields={len(fields)}, critical={critical_count}, content_ids={len(content_ids)}"
        )

        return min(base_score, 1.0)

    def _assess_relevance_quality(self, chunks: list) -> float:
        """
        Assess the relevance of retrieved sources based on scores and field quality.

        Factors:
        - Average relevance score (higher is better)
        - Top result relevance (must be good)
        - Field weight quality (title/description weight more)
        """
        if not chunks:
            return 0.5

        relevance_scores = []
        field_weights = []

        for chunk in chunks:
            metadata = chunk.get("metadata", {})
            score = metadata.get("relevance_score")
            metadata.get("source_field", "unknown")
            field_weight = metadata.get("field_weight", 0.6)

            if score is not None:
                relevance_scores.append(score)
            field_weights.append(field_weight)

        if not relevance_scores:
            return 0.7  # Default if no scores available

        avg_relevance = sum(relevance_scores) / len(relevance_scores)
        top_relevance = max(relevance_scores)
        avg_field_weight = (
            sum(field_weights) / len(field_weights) if field_weights else 0.6
        )

        # Score interpretation based on averages
        if avg_relevance > 0.85:
            base_score = 0.95
        elif avg_relevance > 0.75:
            base_score = 0.88
        elif avg_relevance > 0.60:
            base_score = 0.80
        elif avg_relevance > 0.45:
            base_score = 0.65
        else:
            base_score = 0.50

        # Top result quality bonus (must have good top match)
        if top_relevance > 0.90:
            base_score = min(base_score * 1.08, 1.0)
        elif top_relevance > 0.85:
            base_score = min(base_score * 1.05, 1.0)
        elif top_relevance < 0.50:
            base_score = base_score * 0.85  # Penalize poor top result

        # Field weight quality (sources from high-weight fields like title/description)
        if avg_field_weight > 0.85:
            base_score = min(base_score * 1.10, 1.0)
        elif avg_field_weight < 0.65:
            base_score = base_score * 0.95  # Slight penalty for low-weight sources

        logger.debug(
            f"Relevance quality: avg={avg_relevance:.3f}, top={top_relevance:.3f}, field_weight={avg_field_weight:.3f}"
        )

        return min(base_score, 1.0)

    def _has_critical_sources(self, chunks: list) -> bool:
        """
        Check if critical high-weight sources (title/description) are present.

        Args:
            chunks: Retrieved chunks

        Returns:
            True if title or description fields are in results
        """
        critical_fields = {"title", "description"}

        for chunk in chunks:
            field = chunk.get("metadata", {}).get("source_field", "")
            if field in critical_fields:
                return True

        return False

    def _extract_sources_metadata(self, chunks: list) -> list:
        """
        Extract and structure source metadata for response.

        Args:
            chunks: Retrieved chunks

        Returns:
            List of source metadata dictionaries
        """
        sources = []
        seen = set()

        for chunk in chunks[:5]:  # Top 5 sources
            metadata = chunk.get("metadata", {})
            content_id = metadata.get("content_id", "unknown")

            # Avoid duplicates
            if content_id in seen:
                continue
            seen.add(content_id)

            source = {
                "content_id": content_id,
                "source_type": metadata.get("source_type", "unknown"),
                "source_field": metadata.get("source_field", "raw_data"),
                "relevance_score": metadata.get("relevance_score", 0.0),
                "url": metadata.get("url"),
                "title": metadata.get("title"),
            }

            # Remove None values
            source = {k: v for k, v in source.items() if v is not None}
            sources.append(source)

        return sources

    def _build_detailed_reasoning(
        self, task_type: str, confidence: float, chunks: list, answer_quality: float
    ) -> str:
        """
        Build detailed reasoning explanation for the confidence score.

        Args:
            task_type: Type of task performed
            confidence: Final confidence score
            chunks: Retrieved chunks
            answer_quality: Quality assessment

        Returns:
            Formatted reasoning string
        """
        reasons = []

        reasons.append(f"Task: {task_type}")
        reasons.append(f"Confidence: {confidence:.1%}")
        reasons.append(f"Answer Quality: {answer_quality:.1%}")

        if chunks:
            field_count = len(
                set(c.get("metadata", {}).get("source_field") for c in chunks)
            )
            reasons.append(f"Source Fields: {field_count}")

            avg_relevance = sum(
                c.get("metadata", {}).get("relevance_score", 0) for c in chunks
            ) / len(chunks)
            reasons.append(f"Avg Relevance: {avg_relevance:.1%}")
        else:
            reasons.append("Sources: None found")

        return " | ".join(reasons)
