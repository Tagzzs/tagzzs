"""
Semantic Enrichment Service

Enhances query and content understanding by:
1. Extracting semantic properties from content (genres, nationalities, professions, etc.)
2. Understanding indirect relationships (actor → country, movie → franchise)
3. Expanding query intent to catch related content
4. Optional web scraping for missing context

This solves the problem where direct matching fails:
- "Is there any Indian?" should match "Akshay Kumar" (even without explicit "Indian" in text)
- "Any Marvel movie?" should match "Deadpool" and "Spiderman" (even without explicit "Marvel" in text)
"""

import logging
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class SemanticEntity:
    """Represents an entity with its semantic properties."""

    name: str
    entity_type: str  # person, movie, company, place, etc.
    properties: Dict[str, Any] = field(
        default_factory=dict
    )  # nationality, genre, profession, etc.
    source_text: str = ""  # where this was found in content
    confidence: float = 1.0  # how confident we are about this entity

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "type": self.entity_type,
            "properties": self.properties,
            "confidence": self.confidence,
        }


@dataclass
class QueryIntent:
    """Represents the semantic intent of a query."""

    original_query: str
    intent_type: str  # boolean_query, list_query, search_query, etc.
    target_properties: Dict[str, Set[str]]  # what properties we're looking for
    target_entities: List[str]  # what entities we're looking for
    relationships: List[str]  # relationships to check (e.g., "is_from", "works_in")
    expanded_keywords: Set[str]  # related keywords to search for


class SemanticEnrichmentService:
    """
    Service to dynamically enrich queries and content with semantic understanding.

    Uses LLM-based reasoning across multiple content parameters:
    - Title, description, personal notes, raw extracted data
    - Vector similarity matching
    - Dynamic property extraction (no hardcoded knowledge base)
    - Web scraping fallback for missing information

    Approach inspired by Perplexity/Claude multi-parameter reasoning.
    """

    def __init__(self, llm_client=None, web_scraper=None):
        """
        Initialize semantic enrichment service.

        Args:
            llm_client: LLM client for intelligent entity extraction and reasoning
            web_scraper: Optional web scraper for fallback information gathering
        """
        self.llm_client = llm_client
        self.web_scraper = web_scraper
        self.extracted_properties_cache = {}  # Cache for dynamically extracted properties

    def analyze_query_intent(self, query: str) -> QueryIntent:
        """
        Analyze the semantic intent of a query.

        Determines what the user is really asking for, not just literal keywords.

        Args:
            query: User's question

        Returns:
            QueryIntent object with analyzed intent
        """
        query_lower = query.lower()

        # Determine intent type
        if any(word in query_lower for word in ["is there", "does", "have", "any"]):
            intent_type = "boolean_query"
        elif any(word in query_lower for word in ["list", "show", "find", "what"]):
            intent_type = "list_query"
        else:
            intent_type = "search_query"

        # Extract target properties (what we're looking for)
        target_properties = self._extract_target_properties(query)

        # Extract target entities
        target_entities = self._extract_target_entities(query)

        # Determine relationships to check
        relationships = self._extract_relationships(query)

        # Expand keywords with related terms
        expanded_keywords = self._expand_query_keywords(query)

        return QueryIntent(
            original_query=query,
            intent_type=intent_type,
            target_properties=target_properties,
            target_entities=target_entities,
            relationships=relationships,
            expanded_keywords=expanded_keywords,
        )

    def _extract_target_properties(self, query: str) -> Dict[str, Set[str]]:
        """Extract what properties/attributes are being asked about."""
        properties = {}
        query_lower = query.lower()

        # Check for nationality/origin
        if any(
            word in query_lower
            for word in [
                "indian",
                "american",
                "british",
                "chinese",
                "russian",
                "french",
                "german",
                "spanish",
            ]
        ):
            nationality = None
            for word in [
                "indian",
                "american",
                "british",
                "chinese",
                "russian",
                "french",
                "german",
                "spanish",
            ]:
                if word in query_lower:
                    nationality = word
                    break
            if nationality:
                properties["nationality"] = {nationality}

        # Check for franchises/genres
        if any(
            word in query_lower
            for word in [
                "marvel",
                "dc",
                "superhero",
                "action",
                "comedy",
                "horror",
                "drama",
                "sci-fi",
            ]
        ):
            properties["franchise"] = set()
            properties["genre"] = set()

            for word in ["marvel", "dc"]:
                if word in query_lower:
                    properties["franchise"].add(word)

            for word in [
                "superhero",
                "action",
                "comedy",
                "horror",
                "drama",
                "sci-fi",
                "adventure",
            ]:
                if word in query_lower:
                    properties["genre"].add(word)

        # Check for profession/role
        if any(
            word in query_lower
            for word in [
                "actor",
                "director",
                "producer",
                "writer",
                "musician",
                "singer",
            ]
        ):
            properties["profession"] = set()
            for word in [
                "actor",
                "director",
                "producer",
                "writer",
                "musician",
                "singer",
            ]:
                if word in query_lower:
                    properties["profession"].add(word)

        # Check for industry
        if any(
            word in query_lower
            for word in ["bollywood", "hollywood", "tech", "finance", "sports"]
        ):
            properties["industry"] = set()
            for word in ["bollywood", "hollywood", "tech", "finance", "sports"]:
                if word in query_lower:
                    properties["industry"].add(word)

        return properties

    def _extract_target_entities(self, query: str) -> List[str]:
        """Extract specific entities mentioned in query."""
        entities = []
        query.lower()

        # Extract potential entity names from query
        # Look for capitalized words and common named entity patterns
        words = query.split()

        for i, word in enumerate(words):
            word_lower = word.lower().strip(".,;:!?")

            # Check for multi-word entities (e.g., "Akshay Kumar", "Iron Man")
            if i < len(words) - 1:
                two_word = f"{word_lower} {words[i + 1].lower().strip('.,;:!?')}"
                if len(two_word) > 3:
                    entities.append(two_word)

            # Single word entities
            if len(word_lower) > 2 and word[0].isupper():
                entities.append(word_lower)

        return entities

    def _extract_relationships(self, query: str) -> List[str]:
        """Extract what relationships we should check."""
        relationships = []
        query_lower = query.lower()

        if any(
            word in query_lower for word in ["is from", "from", "nationality", "origin"]
        ):
            relationships.append("is_from")

        if any(word in query_lower for word in ["in", "franchise", "universe"]):
            relationships.append("belongs_to")

        if any(word in query_lower for word in ["works", "industry"]):
            relationships.append("works_in")

        if any(word in query_lower for word in ["is a", "profession", "role"]):
            relationships.append("has_profession")

        return relationships

    def _expand_query_keywords(self, query: str) -> Set[str]:
        """Expand query with related keywords."""
        expanded = set(query.lower().split())

        # Add related terms
        expansions = {
            "marvel": ["superhero", "mcu", "comic", "franchise"],
            "dc": ["superhero", "dcu", "comic", "franchise"],
            "indian": ["india", "bollywood", "tamil", "telugu", "hindi"],
            "american": ["usa", "hollywood", "us"],
            "actor": ["actress", "performer", "star", "celebrity"],
            "movie": ["film", "cinema", "video", "production"],
            "superhero": ["hero", "powers", "abilities", "costume"],
        }

        for keyword, related in expansions.items():
            if keyword in expanded:
                expanded.update(related)

        return expanded

    def extract_semantic_entities(
        self, content: str, metadata: Optional[Dict] = None
    ) -> List[SemanticEntity]:
        """
        Dynamically extract semantic entities from content using LLM reasoning.

        Searches across multiple content parameters:
        - title, description, personal notes, raw_data (from metadata)
        - content body
        - Infers properties through reasoning

        Args:
            content: Main text content to analyze
            metadata: Optional dict with {title, description, notes, raw_data, vector_embedding, etc.}

        Returns:
            List of SemanticEntity objects with dynamically extracted properties
        """
        entities = []

        # Combine all available content sources
        full_context = self._build_analysis_context(content, metadata)

        # Use LLM to intelligently extract entities and properties
        if self.llm_client:
            entities = self._extract_via_llm(full_context, metadata)
        else:
            # Fallback: basic pattern matching across all fields
            entities = self._extract_via_patterns(full_context, metadata)

        # Cache extracted properties for this content
        content_hash = hash(content)
        self.extracted_properties_cache[content_hash] = {
            e.name: e.properties for e in entities
        }

        return entities

    def _build_analysis_context(self, content: str, metadata: Optional[Dict]) -> str:
        """
        Build comprehensive context from all available sources.
        Keeps context under 2000 chars to avoid token limit issues.

        Args:
            content: Main content
            metadata: Additional metadata with title, description, notes, etc.

        Returns:
            Combined context string with all available information
        """
        context_parts = []

        # Prioritize high-value metadata
        if metadata:
            if metadata.get("title"):
                context_parts.append(f"TITLE: {metadata['title']}")
            if metadata.get("description"):
                # Limit description to 300 chars
                desc = metadata["description"]
                if len(desc) > 300:
                    desc = desc[:300] + "..."
                context_parts.append(f"DESC: {desc}")
            if metadata.get("tags"):
                context_parts.append(
                    f"TAGS: {', '.join(metadata['tags'][:10])}"
                )  # First 10 tags only
            if metadata.get("personal_notes"):
                notes = metadata["personal_notes"]
                if len(notes) > 200:
                    notes = notes[:200] + "..."
                context_parts.append(f"NOTES: {notes}")

        # Include only first 400 chars of content to stay under token limit
        content_truncated = content[:400]
        if len(content) > 400:
            content_truncated += "..."
        context_parts.append(f"CONTENT: {content_truncated}")

        return "\n".join(context_parts)

    def _extract_via_llm(
        self, full_context: str, metadata: Optional[Dict]
    ) -> List[SemanticEntity]:
        """
        Use LLM to intelligently extract entities and their semantic properties.

        Args:
            full_context: Combined context from all sources
            metadata: Content metadata

        Returns:
            List of extracted semantic entities
        """
        try:
            # Concise prompt to stay under token limit
            extraction_prompt = f"""Extract entities. Format: NAME|TYPE|prop:val,prop:val

Text:
{full_context}

Output one entity per line. Types: person, movie, company, place. Stop after 5 entities."""

            # Call LLM
            response = self.llm_client.call_llm(extraction_prompt)

            # Parse structured response
            entities = []
            for line in response.strip().split("\n"):
                line = line.strip()
                if not line or "|" not in line:
                    continue

                try:
                    parts = line.split("|", 2)
                    if len(parts) < 2:
                        continue

                    name = parts[0].strip()
                    entity_type = parts[1].strip()

                    # Parse properties if present
                    properties = {}
                    if len(parts) > 2:
                        prop_str = parts[2].strip()
                        for prop_pair in prop_str.split(","):
                            if ":" in prop_pair:
                                k, v = prop_pair.split(":", 1)
                                properties[k.strip()] = v.strip()

                    if name:
                        entity = SemanticEntity(
                            name=name,
                            entity_type=entity_type or "unknown",
                            properties=properties,
                            source_text=full_context[:200],
                            confidence=0.85,
                        )
                        entities.append(entity)
                except Exception as parse_error:
                    logger.debug(f"Could not parse entity line '{line}': {parse_error}")
                    continue

            if entities:
                logger.info(f"LLM extracted {len(entities)} entities")
                return entities
            else:
                logger.info("LLM returned no entities, using pattern matching fallback")
                return self._extract_via_patterns(full_context, metadata)

        except Exception as e:
            logger.warning(
                f"LLM extraction failed: {e}. Using pattern matching fallback."
            )
            return self._extract_via_patterns(full_context, metadata)

    def _extract_via_patterns(
        self, full_context: str, metadata: Optional[Dict]
    ) -> List[SemanticEntity]:
        """
        Fallback pattern-based entity extraction across all content fields.

        Args:
            full_context: Combined context
            metadata: Content metadata

        Returns:
            List of extracted entities
        """
        entities = []
        context_lower = full_context.lower()

        # Pattern matching across all fields
        # Nationality patterns
        nationalities = {
            "indian": ["india", "bollywood", "hindi", "tamil", "telugu"],
            "american": ["usa", "hollywood", "american"],
            "british": ["uk", "london", "british"],
            "chinese": ["china", "chinese"],
        }

        # Profession patterns
        professions = {
            "actor": ["acting", "film", "movie", "cinema"],
            "director": ["directing", "director", "film"],
            "producer": ["producing", "producer"],
            "writer": ["writing", "author", "script"],
            "musician": ["music", "song", "album", "artist"],
        }

        # Franchise patterns
        franchises = {
            "marvel": ["mcu", "avengers", "superhero", "ironman", "spiderman"],
            "dc": ["batman", "superman", "wonderwoman"],
        }

        # Extract based on patterns
        found_entities = {}

        # Look for named entities
        for word in context_lower.split():
            word_clean = word.strip(".,;:!?")
            if len(word_clean) > 3:  # Only meaningful words
                # Check against known patterns
                for entity_type, pattern_dict in [
                    ("nationality", nationalities),
                    ("profession", professions),
                    ("franchise", franchises),
                ]:
                    for value, keywords in pattern_dict.items():
                        for keyword in keywords:
                            if keyword in context_lower:
                                if word_clean not in found_entities:
                                    found_entities[word_clean] = {entity_type: value}
                                else:
                                    found_entities[word_clean][entity_type] = value

        # Convert to SemanticEntity objects
        for entity_name, properties in found_entities.items():
            entity = SemanticEntity(
                name=entity_name,
                entity_type="inferred",
                properties=properties,
                source_text=full_context[:200],
                confidence=0.6,
            )
            entities.append(entity)

        return entities

    def match_content_to_intent(
        self,
        content: str,
        intent: QueryIntent,
        metadata: Optional[Dict] = None,
        vector_score: float = 0.0,
    ) -> float:
        """
        Calculate how well content matches query intent across multiple parameters.

        Searches across:
        - Title, description, personal notes, raw data (from metadata)
        - Content body
        - Vector similarity score
        - Dynamically extracted properties

        This is the key function that enables accurate, comprehensive search.

        Args:
            content: The content to check
            intent: The query intent to match against
            metadata: Optional metadata with title, description, notes, etc.
            vector_score: Vector similarity score (0-1) from embedding search

        Returns:
            Match score (0-1, higher is better)
        """
        if not intent.target_properties and not intent.target_entities:
            return vector_score  # Fall back to vector score

        score_components = {}

        # Score 1: Vector similarity (foundation)
        score_components["vector"] = vector_score

        # Score 2: Extract entities from all content sources
        entities = self.extract_semantic_entities(content, metadata)

        # Score 3: Multi-parameter property matching
        property_score = self._score_property_match(entities, intent, metadata)
        score_components["property"] = property_score

        # Score 4: Title/description matching
        title_score = self._score_title_match(intent, metadata)
        score_components["title"] = title_score

        # Score 5: Cross-parameter consistency
        consistency_score = self._score_parameter_consistency(
            content, metadata, intent, entities
        )
        score_components["consistency"] = consistency_score

        # Weighted combination (Perplexity-style multi-factor reasoning)
        final_score = (
            score_components["vector"] * 0.25  # Foundation: vector similarity
            + score_components["property"] * 0.35  # Main: semantic property matching
            + score_components["title"] * 0.20  # Context: title/description
            + score_components["consistency"] * 0.20  # Quality: parameter consistency
        )

        logger.debug(
            f"Match scores - Vector: {score_components['vector']:.2f}, "
            f"Property: {score_components['property']:.2f}, "
            f"Title: {score_components['title']:.2f}, "
            f"Consistency: {score_components['consistency']:.2f} → Final: {final_score:.2f}"
        )

        return min(final_score, 1.0)

    def _score_property_match(
        self,
        entities: List[SemanticEntity],
        intent: QueryIntent,
        metadata: Optional[Dict],
    ) -> float:
        """
        Score how well content properties match query intent.

        Searches across all extracted properties with reasoning.
        """
        if not intent.target_properties or not entities:
            return 0.0

        match_score = 0.0
        total_properties = sum(
            len(values) for values in intent.target_properties.values()
        )

        for entity in entities:
            for property_name, target_values in intent.target_properties.items():
                entity_property = entity.properties.get(property_name)

                if entity_property:
                    # Handle string properties
                    if isinstance(entity_property, str):
                        if entity_property.lower() in {
                            v.lower() for v in target_values
                        }:
                            match_score += entity.confidence
                    # Handle list properties (multiple values)
                    elif isinstance(entity_property, list):
                        if any(
                            p.lower() in {v.lower() for v in target_values}
                            for p in entity_property
                        ):
                            match_score += entity.confidence

        return min(match_score / max(total_properties, 1), 1.0)

    def _score_title_match(
        self, intent: QueryIntent, metadata: Optional[Dict]
    ) -> float:
        """
        Score how well title/description match the query intent.
        """
        if not metadata:
            return 0.0

        title = (metadata.get("title") or "").lower()
        description = (metadata.get("description") or "").lower()
        context = f"{title} {description}"

        if not context.strip():
            return 0.0

        match_count = 0
        for keywords in intent.target_properties.values():
            for keyword in keywords:
                if keyword.lower() in context:
                    match_count += 1

        return min(match_count / max(len(intent.target_properties), 1), 1.0)

    def _score_parameter_consistency(
        self,
        content: str,
        metadata: Optional[Dict],
        intent: QueryIntent,
        entities: List[SemanticEntity],
    ) -> float:
        """
        Score consistency of information across all parameters.

        Higher consistency = more reliable match.
        """
        consistency_score = 0.0
        checks = 0

        # Check 1: Do title and content align?
        if metadata and metadata.get("title"):
            title_words = set(metadata["title"].lower().split())
            content_words = set(content.lower().split())
            overlap = len(title_words & content_words)
            consistency_score += min(overlap / max(len(title_words), 1), 1.0)
            checks += 1

        # Check 2: Do entities appear in multiple places?
        entity_mentions = {}
        for entity in entities:
            mentions = content.lower().count(entity.name.lower())
            if mentions > 1:
                entity_mentions[entity.name] = mentions

        if entity_mentions:
            consistency_score += min(len(entity_mentions) / max(len(entities), 1), 1.0)
            checks += 1

        # Check 3: Do properties align across entities?
        property_alignment = 0
        for entity1 in entities:
            for entity2 in entities:
                if entity1.name != entity2.name:
                    shared_properties = set(entity1.properties.keys()) & set(
                        entity2.properties.keys()
                    )
                    if shared_properties:
                        property_alignment += 1

        if entities and len(entities) > 1:
            consistency_score += min(
                property_alignment / max(len(entities) * (len(entities) - 1) / 2, 1),
                1.0,
            )
            checks += 1

        return consistency_score / max(checks, 1)

    def enrich_response_context(
        self,
        query: str,
        content: str,
        intent: QueryIntent,
        entities: List[SemanticEntity],
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Enrich the response context with comprehensive semantic information.

        Combines information from all sources and includes web-scraped data if needed.

        Args:
            query: Original user query
            content: Retrieved content
            intent: Analyzed query intent
            entities: Extracted entities from content
            metadata: Optional metadata with additional context

        Returns:
            Enhanced context string for LLM with comprehensive information
        """
        context_parts = []

        # Add query context
        context_parts.append(f"USER QUERY: {query}")
        context_parts.append(f"SEARCH INTENT: {intent.intent_type}")
        context_parts.append("")

        # Add entity information with comprehensive details
        if entities:
            context_parts.append("ENTITIES IDENTIFIED:")
            for entity in entities:
                # Build properties string, safely handling different value types
                property_parts = []
                for k, v in entity.properties.items():
                    # Convert all values to strings safely
                    if isinstance(v, (list, tuple)):
                        value_str = ", ".join(str(item) for item in v)
                    elif v is not None:
                        value_str = str(v)
                    else:
                        continue
                    property_parts.append(f"{k}: {value_str}")

                properties_str = ", ".join(property_parts)
                context_parts.append(
                    f"  • {entity.name} ({entity.entity_type}, confidence: {entity.confidence:.2f})"
                )
                if properties_str:
                    context_parts.append(f"    Properties: {properties_str}")
            context_parts.append("")

        # Add metadata context if available
        if metadata:
            context_parts.append("CONTENT METADATA:")
            if metadata.get("title"):
                context_parts.append(f"  • Title: {metadata['title']}")
            if metadata.get("description"):
                context_parts.append(f"  • Description: {metadata['description']}")
            if metadata.get("personal_notes"):
                context_parts.append(f"  • Notes: {metadata['personal_notes']}")
            if metadata.get("tags"):
                context_parts.append(f"  • Tags: {', '.join(metadata['tags'])}")
            context_parts.append("")

        # Add query target information
        if intent.target_properties:
            context_parts.append("LOOKING FOR:")
            for prop, values in intent.target_properties.items():
                context_parts.append(f"  • {prop}: {', '.join(values)}")
            context_parts.append("")

        # Add web-scraped information if LLM indicated missing data
        if self._should_fetch_web_data(entities, intent):
            web_data = self._fetch_web_enrichment(query, entities)
            if web_data:
                context_parts.append("ENRICHED DATA (from web):")
                context_parts.append(web_data)
                context_parts.append("")

        context_parts.append(
            "INSTRUCTION: Provide accurate, comprehensive answer using all available information."
        )

        return "\n".join(context_parts)

    def _should_fetch_web_data(
        self, entities: List[SemanticEntity], intent: QueryIntent
    ) -> bool:
        """
        Determine if web scraping should be used to enrich data.

        Returns True if:
        - Very few entities found
        - Low confidence scores
        - Query targets properties we didn't find
        """
        if not entities:
            return True

        avg_confidence = sum(e.confidence for e in entities) / len(entities)
        if avg_confidence < 0.6:
            return True

        # Check if we found all requested properties
        found_properties = set()
        for entity in entities:
            found_properties.update(entity.properties.keys())

        requested_properties = set(intent.target_properties.keys())
        missing = requested_properties - found_properties

        return len(missing) > 0

    def _fetch_web_enrichment(self, query: str, entities: List[SemanticEntity]) -> str:
        """
        Fetch enrichment data from web using web scraper.

        Similar to Perplexity's approach of scraping web when local data insufficient.

        Args:
            query: Original query
            entities: Entities that need enrichment

        Returns:
            Formatted enriched data from web
        """
        if not self.web_scraper:
            return ""

        try:
            enriched_info = []

            # Scrape information for each entity
            for entity in entities:
                # Build scrape query from entity and original query
                scrape_query = f"{entity.name} {query}".strip()
                web_result = self.web_scraper.search(scrape_query)

                if web_result:
                    enriched_info.append(
                        f"About {entity.name}: {web_result.get('summary', '')}"
                    )

                    # Extract additional properties from web result
                    if web_result.get("properties"):
                        for prop, value in web_result["properties"].items():
                            if prop not in entity.properties:
                                entity.properties[prop] = value

            logger.info(f"Fetched web enrichment for {len(enriched_info)} entities")
            return "\n".join(enriched_info)

        except Exception as e:
            logger.warning(f"Web scraping failed: {e}")
            return ""

    def check_property_exists(
        self,
        content: str,
        property_name: str,
        property_value: str,
        metadata: Optional[Dict] = None,
    ) -> bool:
        """
        Check if content has a specific property value across all parameters.

        Searches title, description, notes, and content body.

        Args:
            content: The content to check
            property_name: The property to look for (e.g., "nationality")
            property_value: The value to match (e.g., "indian")
            metadata: Optional metadata with additional fields

        Returns:
            True if property exists in content or metadata
        """
        # Check metadata fields first
        if metadata:
            for field in ["title", "description", "personal_notes", "raw_data"]:
                field_value = metadata.get(field, "").lower()
                if property_value.lower() in field_value:
                    return True

        # Extract entities from content
        entities = self.extract_semantic_entities(content, metadata)

        for entity in entities:
            entity_property = entity.properties.get(property_name)

            if entity_property:
                if isinstance(entity_property, str):
                    if entity_property.lower() == property_value.lower():
                        return True
                elif isinstance(entity_property, list):
                    if property_value.lower() in {p.lower() for p in entity_property}:
                        return True

        return False

    def find_properties_in_content(
        self, content: str, property_name: str, metadata: Optional[Dict] = None
    ) -> List[str]:
        """
        Find all entities with a specific property in content across all parameters.

        Example: Find all entities with nationality="indian"

        Args:
            content: The content to search
            property_name: The property to look for
            metadata: Optional metadata to search as well

        Returns:
            List of entity names that have this property
        """
        entities = self.extract_semantic_entities(content, metadata)
        matching_entities = []

        for entity in entities:
            if property_name in entity.properties:
                matching_entities.append(entity.name)

        return matching_entities

    def search_multi_parameter(
        self, query: str, content_sources: Dict[str, str], metadata_list: List[Dict]
    ) -> List[Dict]:
        """
        Comprehensive search across multiple content parameters and sources.

        Mimics Perplexity's approach of searching multiple parameter types
        and returning consolidated results with reasoning.

        Args:
            query: User's search query
            content_sources: Dict with {content_id: content_text}
            metadata_list: List of metadata dicts with {title, description, notes, raw_data}

        Returns:
            List of ranked results with match scores and reasoning
        """
        intent = self.analyze_query_intent(query)
        results = []

        # Search across all content sources
        for content_id, content in content_sources.items():
            # Find corresponding metadata
            metadata = next(
                (m for m in metadata_list if m.get("id") == content_id), None
            )

            # Get vector score (if available from external search)
            vector_score = 0.0  # Would come from vector DB in real implementation

            # Calculate match score
            match_score = self.match_content_to_intent(
                content, intent, metadata, vector_score
            )

            if match_score > 0.3:  # Only include relevant results
                # Extract entities for detail
                entities = self.extract_semantic_entities(content, metadata)

                results.append(
                    {
                        "content_id": content_id,
                        "score": match_score,
                        "title": metadata.get("title") if metadata else "Untitled",
                        "summary": content[:300],
                        "entities": [e.to_dict() for e in entities],
                        "reasoning": self._generate_match_reasoning(
                            intent, entities, metadata
                        ),
                    }
                )

        # Sort by score (highest first)
        results.sort(key=lambda x: x["score"], reverse=True)

        return results

    def _generate_match_reasoning(
        self,
        intent: QueryIntent,
        entities: List[SemanticEntity],
        metadata: Optional[Dict],
    ) -> str:
        """
        Generate human-readable reasoning for why content matched the query.

        Similar to how Perplexity explains its search results.
        """
        reasons = []

        # Property match reasoning
        if intent.target_properties:
            found_properties = []
            for entity in entities:
                for prop, values in intent.target_properties.items():
                    if prop in entity.properties:
                        found_properties.append(
                            f"{entity.name} has {prop} = {entity.properties[prop]}"
                        )

            if found_properties:
                reasons.append("Properties matched: " + "; ".join(found_properties))

        # Entity match reasoning
        if entities:
            reasons.append(
                f"Found {len(entities)} relevant entities: {', '.join(e.name for e in entities)}"
            )

        # Metadata match reasoning
        if metadata and metadata.get("title"):
            if any(
                keyword in metadata["title"].lower()
                for keywords in intent.target_properties.values()
                for keyword in keywords
            ):
                reasons.append(f"Title mentions search terms: '{metadata['title']}'")

        return (
            " | ".join(reasons) if reasons else "Matched based on semantic similarity"
        )


# Global instance
_semantic_service = None


def get_semantic_service(llm_client=None) -> SemanticEnrichmentService:
    """
    Get or create semantic enrichment service instance.

    Automatically initializes with Groq client if no LLM client provided.
    """
    global _semantic_service
    if _semantic_service is None:
        # Use provided client or initialize Groq directly
        if llm_client is None:
            try:
                from app.clients import get_groq_client

                groq_client = get_groq_client()

                # Wrap Groq client to match LLMClient interface (call_llm method)
                class GroqLLMAdapter:
                    """Adapter to make Groq client compatible with semantic enrichment"""

                    def __init__(self, groq_client):
                        self.client = groq_client

                    def call_llm(
                        self,
                        prompt: str,
                        system_prompt: str = None,
                        temperature: float = None,
                    ) -> str:
                        """Call Groq API and return response text"""
                        messages = []
                        if system_prompt:
                            messages.append(
                                {"role": "system", "content": system_prompt}
                            )
                        messages.append({"role": "user", "content": prompt})

                        kwargs = {
                            "model": "llama-3.3-70b-versatile",
                            "messages": messages,
                        }
                        if temperature is not None:
                            kwargs["temperature"] = temperature

                        response = self.client.chat.completions.create(**kwargs)
                        return response.choices[0].message.content

                llm_client = GroqLLMAdapter(groq_client)
                logger.info("✅ SemanticEnrichmentService initialized with Groq LLM")
            except Exception as e:
                logger.warning(
                    f"Failed to initialize Groq client: {e}. "
                    "Falling back to pattern matching only (no LLM)."
                )
                llm_client = None

        _semantic_service = SemanticEnrichmentService(llm_client)
        if llm_client:
            logger.info("✅ Semantic enrichment ready with Groq LLM support")
        else:
            logger.info("⚠️  Semantic enrichment using pattern matching only")

    return _semantic_service


def reset_semantic_service():
    """Reset the global service instance."""
    global _semantic_service
    _semantic_service = None
