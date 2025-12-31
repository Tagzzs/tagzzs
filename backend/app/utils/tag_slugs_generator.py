import re

"""
/**
 * Tag Slug Generator
 * Converts tag names to clean, URL-friendly slugs for use as tag IDs
 * 
 * Rules:
 * - Spaces → hyphens (Web Development → web-development)
 * - Lowercase everything
 * - Remove special characters except hyphens
 * - Convert dots to hyphens (React.js → react-js)
 * - Remove duplicate hyphens
 * - Trim hyphens from start/end
 */
"""


def generate_tag_slug(tag_name: str) -> str:
    if not tag_name or not isinstance(tag_name, str):
        return ""

    slug = tag_name.lower().strip()
    slug = re.sub(r"\.", "-", slug)
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")
