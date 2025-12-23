"""
MetadataProcessor - Query Parsing and Metadata Handler

Extracts metadata filters from natural language queries and
builds Chroma-compatible where clauses.
"""

import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class MetadataProcessor:
    """
    Process natural language queries to extract metadata filters.
    
    Handles:
    - Keyword extraction for metadata queries
    - Chroma where clause building
    - Result formatting and aggregation
    - Field projection
    """

    # Common keywords for metadata queries
    KEYWORDS = {
        # Source type keywords
        'pdf': ['pdf', 'document'],
        'web': ['web', 'website', 'url', 'online'],
        'video': ['video', 'youtube', 'yt'],
        'audio': ['audio', 'podcast', 'mp3'],
        
        # Time keywords
        'recent': ['recent', 'latest', 'new', 'today', 'this week'],
        'old': ['old', 'old', 'archived', 'year ago'],
        
        # Tag keywords (will be extracted as is)
    }

    def __init__(self):
        """Initialize MetadataProcessor."""
        logger.info("MetadataProcessor initialized")

    def extract_filters_from_query(
        self,
        query: str
    ) -> Dict[str, Any]:
        """
        Extract metadata filters from natural language query.
        
        Args:
            query: Natural language query (e.g., "show me all AI PDFs")
            
        Returns:
            Dictionary with extracted filters
            
        Example:
            >>> proc = MetadataProcessor()
            >>> filters = proc.extract_filters_from_query("all AI PDFs")
            >>> print(filters)
            {'source_type': 'pdf', 'tags': ['AI']}
        """
        filters = {}
        query_lower = query.lower()
        
        # Extract source type
        for source_type, keywords in self.KEYWORDS.items():
            if source_type not in ['recent', 'old']:  # Skip time for now
                for keyword in keywords:
                    if keyword in query_lower:
                        filters['source_type'] = source_type
                        break
        
        # Extract tags (capitalized words that aren't common words)
        common_words = {'all', 'show', 'me', 'tell', 'list', 'find', 'give', 'content', 
                       'items', 'documents', 'files', 'with', 'the', 'of', 'from', 'by'}
        
        words = query.split()
        tags = []
        for word in words:
            # Check if word is capitalized and not a common word
            if word and word[0].isupper() and word.lower() not in common_words:
                tags.append(word.rstrip('.,!?'))
        
        if tags:
            filters['tags'] = tags
        
        logger.debug(f"Extracted filters: {filters}")
        return filters

    def build_where_clause(
        self,
        filters: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Build Chroma where clause from filters dict.
        
        Args:
            filters: Dictionary of filters to apply
            
        Returns:
            Chroma where clause dict, or None if no filters
            
        Example:
            >>> proc = MetadataProcessor()
            >>> where = proc.build_where_clause({'source_type': 'pdf'})
            >>> print(where)  # {'source_type': {'$eq': 'pdf'}}
        """
        if not filters:
            return None
        
        conditions = []
        
        # Build conditions for each filter
        for key, value in filters.items():
            if key == 'source_type':
                conditions.append({'source_type': {'$eq': value}})
            elif key == 'tags':
                if isinstance(value, list) and len(value) == 1:
                    # Single tag - use $in operator
                    conditions.append({'tags': {'$in': [value[0]]}})
                elif isinstance(value, list):
                    # Multiple tags - use $in operator
                    conditions.append({'tags': {'$in': value}})
                else:
                    # Single string tag
                    conditions.append({'tags': {'$in': [value]}})
            elif key == 'created_after':
                conditions.append({'created_date': {'$gte': value}})
            elif key == 'created_before':
                conditions.append({'created_date': {'$lte': value}})
            else:
                # Generic string match
                conditions.append({key: {'$eq': value}})
        
        # Build final where clause
        if len(conditions) == 1:
            where_clause = conditions[0]
        elif len(conditions) > 1:
            where_clause = {'$and': conditions}
        else:
            return None
        
        logger.debug(f"Built where clause: {where_clause}")
        return where_clause

    def format_results(
        self,
        results: List[Dict[str, Any]],
        fields: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Format and project results to requested fields.
        
        Args:
            results: Raw results from database
            fields: List of fields to include (None = all)
            
        Returns:
            Formatted results with only requested fields
            
        Example:
            >>> results = [{"id": "1", "metadata": {"title": "AI"}}]
            >>> formatted = proc.format_results(results, ["title"])
        """
        formatted = []
        
        for result in results:
            formatted_item = {}
            
            if fields:
                # Only include specified fields
                for field in fields:
                    if field == 'id' and 'id' in result:
                        formatted_item['id'] = result['id']
                    elif field in result:
                        formatted_item[field] = result[field]
                    elif 'metadata' in result and field in result['metadata']:
                        formatted_item[field] = result['metadata'][field]
            else:
                # Include all fields
                formatted_item = result
            
            if formatted_item:  # Only add non-empty results
                formatted.append(formatted_item)
        
        logger.debug(f"Formatted {len(formatted)} results")
        return formatted

    def aggregate_metadata(
        self,
        results: List[Dict[str, Any]],
        group_by: Optional[str] = None,
        count: bool = False,
        sort_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Aggregate metadata from results (grouping, counting, etc.).
        
        Args:
            results: Results to aggregate
            group_by: Field to group by
            count: Whether to count items
            sort_by: Field to sort by
            
        Returns:
            Aggregated results
            
        Example:
            >>> results = [{"tag": "AI"}, {"tag": "AI"}, {"tag": "ML"}]
            >>> agg = proc.aggregate_metadata(results, group_by="tag", count=True)
        """
        if not results:
            return {}
        
        aggregation = {}
        
        # Grouping
        if group_by:
            groups = {}
            for result in results:
                key = None
                if group_by in result:
                    key = result[group_by]
                elif 'metadata' in result and group_by in result['metadata']:
                    key = result['metadata'][group_by]
                
                if key:
                    if key not in groups:
                        groups[key] = []
                    groups[key].append(result)
            
            # Count if requested
            if count:
                aggregation[f"{group_by}_counts"] = {k: len(v) for k, v in groups.items()}
            else:
                aggregation[f"{group_by}_groups"] = groups
        
        # Sorting
        if sort_by and not group_by:
            results = sorted(
                results,
                key=lambda x: x.get(sort_by, x.get('metadata', {}).get(sort_by, '')),
                reverse=True
            )
            aggregation['sorted_results'] = results
        
        # Basic counting
        if count and not group_by:
            aggregation['total_count'] = len(results)
        
        logger.debug(f"Aggregated results: {aggregation}")
        return aggregation

    def parse_query_intent(
        self,
        query: str
    ) -> Dict[str, Any]:
        """
        Determine the intent behind a metadata query.
        
        Args:
            query: The query text
            
        Returns:
            Dictionary with intent analysis
            
        Example:
            >>> intent = proc.parse_query_intent("count all PDFs")
            >>> print(intent)  # {'action': 'count', 'filters': {...}}
        """
        intent = {
            'action': 'filter',
            'filters': self.extract_filters_from_query(query),
            'fields': None,
            'query_type': 'metadata_filter'  # Default to metadata filter
        }
        
        query_lower = query.lower()
        
        # Detect if this is a "list all tags" or "show all metadata tags" query
        if any(phrase in query_lower for phrase in ['all metadata tags', 'all tags', 'list tags', 'what tags', 'which tags', 'show tags']):
            intent['action'] = 'list_tags'
            intent['query_type'] = 'list_tags'
            intent['filters'] = {}  # No filters needed
            logger.info(f"[PARSE_QUERY] Detected 'list all tags' query: {query}")
            return intent
        
        # Detect action
        if 'count' in query_lower or 'how many' in query_lower:
            intent['action'] = 'count'
        elif 'list' in query_lower or 'show' in query_lower or 'get' in query_lower:
            intent['action'] = 'list'
        elif 'group' in query_lower or 'group by' in query_lower:
            intent['action'] = 'group'
        
        # Extract requested fields
        if 'only' in query_lower or 'just' in query_lower:
            # Try to extract field names
            pass  # TODO: Implement field extraction
        
        logger.debug(f"Query intent: {intent}")
        return intent

    def validate_filter(
        self,
        filter_key: str,
        filter_value: Any
    ) -> bool:
        """
        Validate if a filter is valid for metadata.
        
        Args:
            filter_key: The filter field name
            filter_value: The filter value
            
        Returns:
            True if valid, False otherwise
        """
        valid_keys = ['source_type', 'tags', 'created_after', 'created_before', 'author']
        
        if filter_key not in valid_keys:
            logger.warning(f"Unknown filter key: {filter_key}")
            return False
        
        if filter_value is None or (isinstance(filter_value, str) and not filter_value.strip()):
            logger.warning(f"Invalid filter value for {filter_key}")
            return False
        
        return True

    def explain_query(
        self,
        query: str
    ) -> str:
        """
        Generate human-readable explanation of what a query will do.
        
        Args:
            query: The metadata query
            
        Returns:
            Explanation string
        """
        intent = self.parse_query_intent(query)
        filters = intent['filters']
        
        explanation = f"This query will {intent['action'].upper()}"
        
        if filters:
            filter_parts = []
            for k, v in filters.items():
                filter_parts.append(f"{k}={v}")
            explanation += f" items with: {', '.join(filter_parts)}"
        
        logger.debug(f"Query explanation: {explanation}")
        return explanation
