'use client';

import { useMemo } from 'react';
import { useContent, ContentItem } from './useContent';
import { useTags, TagNode } from './useTags';

// Graph node types for neural visualization
export interface GraphNode {
  id: string;
  label: string;
  type: 'root' | 'category' | 'sub' | 'content';
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  parent?: string;
  data?: ContentItem;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  deepData: DeepDataCategory[];
}

// Structure for LibraryPanel compatibility
export interface DeepDataCategory {
  name: string;
  tagId: string;
  subs: DeepDataSub[];
}

export interface DeepDataSub {
  name: string;
  tagId: string;
  items: DeepDataItem[];
}

export interface DeepDataItem {
  name: string;
  desc: string;
  image: string;
  content: string;
  contentId: string;
}

const COLORS = {
  root: '#FFFFFF',
  cat: '#A78BFA',
  sub: '#3B82F6',
  content: '#22D3EE',
};

/**
 * Hook to fetch and transform user content/tags into graph structure
 * for the neural-graph visualization.
 */
export function useGraphData() {
  const { content, loading: contentLoading, error: contentError } = useContent();
  const { tagTree, tagsMap, loading: tagsLoading, error: tagsError } = useTags();

  const loading = contentLoading || tagsLoading;
  const error = contentError || tagsError;

  // Build graph data from tags and content
  const graphData = useMemo<GraphData>(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const deepData: DeepDataCategory[] = [];

    // Root node
    nodes.push({
      id: 'root',
      label: 'Root',
      type: 'root',
      x: 0,
      y: 0,
      z: 0,
      radius: 12,
      color: COLORS.root,
    });

    // Create content lookup by tag
    const tagContentMap = new Map<string, ContentItem[]>();
    content.forEach((item) => {
      if (item.tagsId && item.tagsId.length > 0) {
        item.tagsId.forEach((tagId) => {
          if (!tagContentMap.has(tagId)) {
            tagContentMap.set(tagId, []);
          }
          tagContentMap.get(tagId)!.push(item);
        });
      }
    });

    // Uncategorized content
    const uncategorizedContent = content.filter(
      (item) => !item.tagsId || item.tagsId.length === 0
    );

    // Layout parameters
    const catRadius = 350;
    const subRadius = 120;
    const contentRadius = 50;

    // Build from tag tree (parent tags = categories)
    tagTree.forEach((parentTag, catIndex) => {
      // Calculate category position
      const phi = Math.acos(-1 + (2 * catIndex) / Math.max(tagTree.length, 1));
      const theta = Math.sqrt(Math.max(tagTree.length, 1) * Math.PI) * phi;
      const cx = catRadius * Math.cos(theta) * Math.sin(phi);
      const cy = catRadius * Math.sin(theta) * Math.sin(phi);
      const cz = catRadius * Math.cos(phi);

      const catId = `cat-${parentTag.id}`;
      nodes.push({
        id: catId,
        label: parentTag.tagName,
        type: 'category',
        x: cx,
        y: cy,
        z: cz,
        radius: 8,
        color: parentTag.tagColor || COLORS.cat,
        parent: 'root',
      });
      links.push({ source: 'root', target: catId });

      // For deepData structure
      const category: DeepDataCategory = {
        name: parentTag.tagName,
        tagId: parentTag.id,
        subs: [],
      };

      // Child tags = subcategories
      if (parentTag.children && parentTag.children.length > 0) {
        parentTag.children.forEach((childTag, subIndex) => {
          const sx = cx + subRadius * Math.cos(subIndex * 1.5 + catIndex);
          const sy = cy + subRadius * Math.sin(subIndex * 1.5 + catIndex);
          const sz = cz + subRadius * Math.cos(subIndex * 1.5);

          const subId = `sub-${childTag.id}`;
          nodes.push({
            id: subId,
            label: childTag.tagName,
            type: 'sub',
            x: sx,
            y: sy,
            z: sz,
            radius: 5,
            color: childTag.tagColor || COLORS.sub,
            parent: catId,
          });
          links.push({ source: catId, target: subId });

          // Get content for this child tag
          const subContent = tagContentMap.get(childTag.id) || [];
          const subItems: DeepDataItem[] = [];

          subContent.forEach((item, contentIndex) => {
            const kx = sx + contentRadius * Math.cos(contentIndex * 2 + subIndex);
            const ky = sy + contentRadius * Math.sin(contentIndex * 2 + subIndex);
            const kz = sz + contentRadius * Math.cos(contentIndex * 2);

            const contentId = `content-${item.id}`;
            nodes.push({
              id: contentId,
              label: item.title || 'Untitled',
              type: 'content',
              x: kx,
              y: ky,
              z: kz,
              radius: 3,
              color: COLORS.content,
              parent: subId,
              data: item,
            });
            links.push({ source: subId, target: contentId });

            subItems.push({
              name: item.title || 'Untitled',
              desc: item.description || '',
              image: item.thumbnailUrl || 'https://picsum.photos/seed/default/800/400',
              content: item.description || '',
              contentId: item.id,
            });
          });

          category.subs.push({
            name: childTag.tagName,
            tagId: childTag.id,
            items: subItems,
          });
        });
      }

      // Content directly on parent tag (no subcategory)
      const parentContent = tagContentMap.get(parentTag.id) || [];
      if (parentContent.length > 0) {
        const directItems: DeepDataItem[] = [];

        parentContent.forEach((item, contentIndex) => {
          const kx = cx + contentRadius * Math.cos(contentIndex * 2);
          const ky = cy + contentRadius * Math.sin(contentIndex * 2);
          const kz = cz + contentRadius * Math.cos(contentIndex * 2);

          const contentId = `content-${item.id}`;
          nodes.push({
            id: contentId,
            label: item.title || 'Untitled',
            type: 'content',
            x: kx,
            y: ky,
            z: kz,
            radius: 3,
            color: COLORS.content,
            parent: catId,
            data: item,
          });
          links.push({ source: catId, target: contentId });

          directItems.push({
            name: item.title || 'Untitled',
            desc: item.description || '',
            image: item.thumbnailUrl || 'https://picsum.photos/seed/default/800/400',
            content: item.description || '',
            contentId: item.id,
          });
        });

        if (directItems.length > 0) {
          category.subs.push({
            name: '', // Empty name = items show directly without subcategory header
            tagId: parentTag.id,
            items: directItems,
          });
        }
      }

      if (category.subs.length > 0) {
        deepData.push(category);
      }
    });

    // Uncategorized content as a special category
    if (uncategorizedContent.length > 0) {
      const uncatId = 'cat-uncategorized';
      const uncatAngle = tagTree.length * 1.2;
      const cx = catRadius * Math.cos(uncatAngle);
      const cy = catRadius * Math.sin(uncatAngle);
      const cz = 0;

      nodes.push({
        id: uncatId,
        label: 'Uncategorized',
        type: 'category',
        x: cx,
        y: cy,
        z: cz,
        radius: 8,
        color: '#808080',
        parent: 'root',
      });
      links.push({ source: 'root', target: uncatId });

      const uncatItems: DeepDataItem[] = [];

      uncategorizedContent.forEach((item, contentIndex) => {
        const kx = cx + contentRadius * Math.cos(contentIndex * 2);
        const ky = cy + contentRadius * Math.sin(contentIndex * 2);
        const kz = contentRadius * Math.cos(contentIndex * 2);

        const contentId = `content-${item.id}`;
        nodes.push({
          id: contentId,
          label: item.title || 'Untitled',
          type: 'content',
          x: kx,
          y: ky,
          z: kz,
          radius: 3,
          color: COLORS.content,
          parent: uncatId,
          data: item,
        });
        links.push({ source: uncatId, target: contentId });

        uncatItems.push({
          name: item.title || 'Untitled',
          desc: item.description || '',
          image: item.thumbnailUrl || 'https://picsum.photos/seed/default/800/400',
          content: item.description || '',
          contentId: item.id,
        });
      });

      deepData.push({
        name: 'Uncategorized',
        tagId: 'uncategorized',
        subs: [{ name: '', tagId: 'uncategorized', items: uncatItems }], // Empty name = items show directly
      });
    }

    return { nodes, links, deepData };
  }, [content, tagTree]);

  // Empty state check
  const isEmpty = !loading && graphData.nodes.length <= 1;

  return {
    graphData,
    loading,
    error,
    isEmpty,
  };
}
