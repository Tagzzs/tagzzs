import { ContentItem } from '@/hooks/useContent';
import { TagNode } from '@/hooks/useTags';

/**
 * TreeNode structure expected by KanbanView and LibrarySidebar.
 * - Parent tags become top-level nodes
 * - Child tags become subcategories
 * - Content items are placed under the tag they belong to
 */
export interface TreeNode {
  name: string;
  tagId?: string;
  tagColor?: string;
  children: TreeSubNode[];
}

export interface TreeSubNode {
  name: string;
  tagId?: string;
  tagColor?: string;
  items: ContentItem[];
}

/**
 * Build tree structure from hierarchical tags and content.
 * 
 * Structure:
 * - Parent tags (no parent_id) → top-level columns
 * - Child tags → subcategories under their parent
 * - Content is linked to tags via tagsId[]
 * - "Uncategorized" column for content without tags
 */
export function buildTreeData(
  tagTree: TagNode[],
  content: ContentItem[],
  tagsMap: Map<string, { id: string; tagName: string; parentId: string | null }>
): TreeNode[] {
  const result: TreeNode[] = [];

  // Create a map of tagId -> content items
  const tagContentMap = new Map<string, ContentItem[]>();
  const usedContentIds = new Set<string>();

  // Assign content to their tags
  content.forEach((item) => {
    if (item.tagsId && item.tagsId.length > 0) {
      item.tagsId.forEach((tagId) => {
        if (!tagContentMap.has(tagId)) {
          tagContentMap.set(tagId, []);
        }
        tagContentMap.get(tagId)!.push(item);
        usedContentIds.add(item.id);
      });
    }
  });

  // Build tree from parent tags
  tagTree.forEach((parentTag) => {
    const children: TreeSubNode[] = [];

    // Check if parent tag name is UUID and resolve
    let parentName = parentTag.tagName;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(parentName)) {
        const resolved = tagsMap.get(parentName);
        if (resolved) parentName = resolved.tagName;
    }

    // Check if parent tag has direct content
    const parentContent = tagContentMap.get(parentTag.id) || [];

    // If parent has child tags, make them subcategories
    if (parentTag.children && parentTag.children.length > 0) {
      parentTag.children.forEach((childTag) => {
        const childContent = tagContentMap.get(childTag.id) || [];
        
        let childName = childTag.tagName;
        if (uuidRegex.test(childName)) {
             const resolved = tagsMap.get(childName);
             if (resolved) childName = resolved.tagName;
        }

        children.push({
          name: childName,
          tagId: childTag.id,
          tagColor: childTag.tagColor,
          items: childContent,
        });
      });

      // If parent has direct content, add as "General" subcategory
      if (parentContent.length > 0) {
        children.unshift({
          name: 'General',
          tagId: parentTag.id,
          tagColor: parentTag.tagColor,
          items: parentContent,
        });
      }
    } else {
      // No child tags, put all content directly (empty name hides subcategory label)
      if (parentContent.length > 0) {
        children.push({
          name: '', // Empty name = show items directly without subcategory header
          tagId: parentTag.id,
          tagColor: parentTag.tagColor,
          items: parentContent,
        });
      }
    }

    // Only add to result if there are children with content
    if (children.length > 0) {
      result.push({
        name: parentName,
        tagId: parentTag.id,
        tagColor: parentTag.tagColor,
        children,
      });
    }
  });

  // Add Uncategorized column for content without tags
  const uncategorizedContent = content.filter(
    (item) => !item.tagsId || item.tagsId.length === 0
  );

  if (uncategorizedContent.length > 0) {
    result.push({
      name: 'Uncategorized',
      tagColor: '#808080',
      children: [
        {
          name: '', // Empty name = show items directly
          items: uncategorizedContent,
        },
      ],
    });
  }

  return result;
}

/**
 * Get all content items flattened from tree structure.
 */
export function getAllItemsFromTree(treeData: TreeNode[]): ContentItem[] {
  const items: ContentItem[] = [];
  const seenIds = new Set<string>();

  treeData.forEach((node) => {
    node.children.forEach((sub) => {
      sub.items.forEach((item) => {
        if (!seenIds.has(item.id)) {
          items.push(item);
          seenIds.add(item.id);
        }
      });
    });
  });

  return items;
}
