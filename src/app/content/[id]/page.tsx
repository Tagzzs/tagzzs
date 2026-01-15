'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useContent } from '@/hooks/useContent';
import { useTags } from '@/hooks/useTags';
import DetailView from '@/app/database/components/DetailView';
import { X, SidebarSimple } from '@phosphor-icons/react';
import LibrarySidebar from '@/app/database/components/LibrarySidebar';
import NeuralMapSidebar from '@/app/database/components/NeuralMapSidebar';
import FloatingSearchBar from '@/app/database/components/FloatingSearchBar';
import { buildTreeData } from '@/utils/buildTreeData';

export default function ContentPage() { 
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    // Fetch content and tags
    const { content, loading: contentLoading } = useContent();
    const { tagsMap, tagTree, loading: tagsLoading } = useTags();

    // Build tree structure from real data
    const treeData = useMemo(() => {
        if (contentLoading || tagsLoading) return [];
        return buildTreeData(tagTree, content, tagsMap);
    }, [tagTree, content, tagsMap, contentLoading, tagsLoading]);

    // Find the current item
    const currentItem = useMemo(() => {
        return content.find(item => item.id === id);
    }, [content, id]);

    // Derived state for DetailView
    const currentDetailItem = useMemo(() => {
        if (!currentItem) return null;

        const tags = currentItem.tagsId
            .map(tagId => tagsMap.get(tagId))
            .filter(t => t !== undefined);

        return {
            id: currentItem.id,
            image: currentItem.thumbnailUrl || `https://picsum.photos/seed/${currentItem.id}/1200/800`,
            category: tags[0]?.tagName || 'General',
            subCategory: tags[1]?.tagName || '',
            title: currentItem.title,
            desc: currentItem.description || 'No description available.',
            content: currentItem.description || '', // TODO: Map 'rawContent' from backend when available
            tags: tags.map(t => t.tagName),
            _original: currentItem
        };
    }, [currentItem, tagsMap]);
    
    // Siblings for navigation
    const allItemsTransformed = useMemo(() => {
        return content.map(item => {
            const tags = item.tagsId
            .map(tagId => tagsMap.get(tagId))
            .filter(t => t !== undefined);
            
            return {
                id: item.id,
                category: tags[0]?.tagName || 'General',
                subCategory: tags[1]?.tagName || '',
            };
        });
    }, [content, tagsMap]);

    // Sidebar States
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarExpandedCats, setSidebarExpandedCats] = useState<Set<string>>(new Set());
    
    // View State
    const [isEditing, setIsEditing] = useState(false);
    const [aiSummaryVisible, setAiSummaryVisible] = useState(true);
    const [aiSummaryText, setAiSummaryText] = useState('');

    // Neural Graph Ref
    const graphRef = useRef<SVGSVGElement>(null);

    const isLoading = contentLoading || tagsLoading;

    // Handlers
    const handleNavigate = useCallback((direction: number) => {
        if (!content.length) return;
        const currentIndex = content.findIndex(item => item.id === id);
        if (currentIndex === -1) return;
        
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < content.length) {
            router.push(`/content/${content[newIndex].id}`);
        }
    }, [content, id, router]);

    const handleToggleSummary = useCallback(() => {
        setAiSummaryVisible(prev => !prev);
    }, []);

    const handleToggleSidebarCat = useCallback((name: string) => {
        setSidebarExpandedCats(prev => {
            const newSet = new Set(prev);
            if (newSet.has(name)) newSet.delete(name); else newSet.add(name);
            return newSet;
        });
    }, []);

    const handleUpdateView = useCallback((name: string) => {
        // Navigate to database view with filter
        router.push(`/database?filter=${encodeURIComponent(name)}`);
    }, [router]);

    // Graph Rendering Logic
    const renderGraph = useCallback(() => {
        const svg = graphRef.current;
        if (!svg) return;
        svg.innerHTML = '';

        const w = svg.clientWidth || 320;
        const h = svg.clientHeight || 200;
        const cx = w / 2;
        const cy = h / 2;

        // Item-centric graph (Item in center, Tags surrounding)
        
        // Helper functions
        const createLine = (x1: number, y1: number, x2: number, y2: number, color: string) => {
            const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
            l.setAttribute("x1", String(x1)); l.setAttribute("y1", String(y1));
            l.setAttribute("x2", String(x2)); l.setAttribute("y2", String(y2));
            l.setAttribute("stroke", color); l.setAttribute("stroke-width", "1");
            l.classList.add("link-line");
            svg.appendChild(l);
        };
        const createCircle = (cx: number, cy: number, r: number, color: string, className: string = "node-circle") => {
            const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            c.setAttribute("cx", String(cx)); c.setAttribute("cy", String(cy));
            c.setAttribute("r", String(r)); c.setAttribute("fill", color);
            c.classList.add(className);
            svg.appendChild(c);
        };
        
        const createText = (x: number, y: number, text: string, color: string, size: number) => {
            const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t.setAttribute("x", String(x)); t.setAttribute("y", String(y + 15));
            t.setAttribute("text-anchor", "middle");
            t.setAttribute("fill", color); t.setAttribute("font-size", String(size));
            t.textContent = text.length > 10 ? text.substring(0, 8) + '..' : text;
            t.classList.add("node-text");
            svg.appendChild(t);
        };

        // Draw center node (Current Item)
        // Using "ITEM" label style from screenshot if desired, or just circle
        createCircle(cx, cy, 14, "#ffffff", "center-pulse");
        
        // Center Text "ITEM" or First 4 chars of title
        const centerLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        centerLabel.setAttribute("x", String(cx)); centerLabel.setAttribute("y", String(cy + 4));
        centerLabel.setAttribute("text-anchor", "middle");
        centerLabel.setAttribute("fill", "#000"); 
        centerLabel.setAttribute("font-size", "8");
        centerLabel.setAttribute("font-weight", "bold");
        centerLabel.textContent = "ITEM"; 
        svg.appendChild(centerLabel);
        
        // Draw related nodes (Tags)
        if (currentDetailItem && currentDetailItem.tags) {
             const tags = currentDetailItem.tags;
             const angleStep = (2 * Math.PI) / (tags.length || 1);
             const radius = 80;
             
             tags.forEach((tag: string, i: number) => {
                 const angle = i * angleStep - (Math.PI / 2); // Start from top
                 const x = cx + Math.cos(angle) * radius;
                 const y = cy + Math.sin(angle) * radius;
                 
                 createLine(cx, cy, x, y, "#3f3f46");
                 createCircle(x, y, 6, "#d4d4d8");
                 createText(x, y, tag, "#a1a1aa", 8);
             });
        }

    }, [currentDetailItem]);

    useEffect(() => {
        renderGraph();
    }, [renderGraph]);

    // Search Mode State for Floating Bar
    const [searchMode, setSearchMode] = useState<'DB' | 'AI'>('DB');

    return (
        <div className="flex h-screen w-full bg-black overflow-hidden relative">
             {/* Left Sidebar (Library) */}
             <LibrarySidebar
                isSidebarOpen={isSidebarOpen}
                treeData={treeData}
                currentFilter={currentDetailItem?.category || 'All'}
                sidebarExpandedCats={sidebarExpandedCats}
                onToggleSidebarCat={handleToggleSidebarCat}
                onUpdateView={handleUpdateView}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
             />

             {/* Main Content Area */}
             <div className="flex-1 h-full overflow-hidden relative flex flex-col min-w-0">
                 {!isSidebarOpen && (
                    <div className="absolute top-4 left-4 z-50">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="bg-black/50 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white p-2 rounded-lg transition-colors backdrop-blur-sm shadow-xl"
                            title="Open Library"
                        >
                            <SidebarSimple weight="bold" />
                        </button>
                    </div>
                 )}

                 {isLoading ? (
                    <div className="flex flex-1 h-full items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-zinc-500 text-sm">Loading content...</p>
                        </div>
                    </div>
                 ) : !currentDetailItem ? (
                    <div className="flex h-full flex-col items-center justify-center bg-black text-white gap-4">
                        <div className="w-16 h-16 mb-2 rounded-full bg-zinc-800 flex items-center justify-center">
                            <X size={32} className="text-zinc-600" />
                        </div>
                        <p className="text-lg">Content not found</p>
                        <button 
                            onClick={() => router.push('/dashboard')} 
                            className="mt-4 text-zinc-400 hover:text-white border border-zinc-700 px-4 py-2 rounded-lg transition-colors"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                 ) : (
                     <DetailView
                        currentDetailItem={currentDetailItem}
                        allItems={allItemsTransformed}
                        isEditing={isEditing}
                        aiSummaryVisible={aiSummaryVisible}
                        aiSummaryText={aiSummaryText || "AI summary generation not yet connected."}
                        onBack={() => router.push('/database')}
                        onNavigate={handleNavigate}
                        onToggleEditing={() => setIsEditing(!isEditing)}
                        onToggleSummary={handleToggleSummary}
                     />
                 )}
             </div>

             {/* Right Sidebar (Neural Map & AI Chat) */}
             <NeuralMapSidebar
                currentFilter={currentDetailItem?.category || 'All'}
                currentDetailItem={currentDetailItem}
                graphRef={graphRef}
             />
        </div>
    );
}
