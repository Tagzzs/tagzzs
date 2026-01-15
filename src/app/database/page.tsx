'use client';

import { useCallback, useEffect, useRef, useState, useMemo, Suspense, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import './db.css';

// Components
import LibrarySidebar from './components/LibrarySidebar';
import DatabaseHeader from './components/DatabaseHeader';
import KanbanView from './components/KanbanView';
import SwimlanesView from './components/SwimlanesView';
import FloatingSearchBar from './components/FloatingSearchBar';
import NeuralMapSidebar from './components/NeuralMapSidebar';
import { QuickCaptureModal } from '@/components/modals/QuickCaptureModal';

// Hooks
import { useContent } from '@/hooks/useContent';
import { useTags } from '@/hooks/useTags';

// Utilities
import { buildTreeData, getAllItemsFromTree, TreeNode } from '@/utils/buildTreeData';

function DatabasePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Get filter from URL, default to 'All'
    const currentFilter = searchParams.get('filter') || 'All';

    // Fetch real data from backend
    const { content, loading: contentLoading } = useContent();
    const { tagTree, tagsMap, loading: tagsLoading } = useTags();

    // Build tree structure from real data
    const treeData = useMemo(() => {
        if (contentLoading || tagsLoading) return [];
        return buildTreeData(tagTree, content, tagsMap);
    }, [tagTree, content, tagsMap, contentLoading, tagsLoading]);

    // Get all items for count
    const allItems = useMemo(() => getAllItemsFromTree(treeData), [treeData]);

    const [sidebarExpandedCats, setSidebarExpandedCats] = useState<Set<string>>(new Set());
    const [kanbanExpandedCats, setKanbanExpandedCats] = useState<Set<string>>(new Set());
    const [kanbanExpandedSubs, setKanbanExpandedSubs] = useState<Set<string>>(new Set());
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchMode, setSearchMode] = useState<'DB' | 'AI'>('DB');
    const [quickCaptureModalOpen, setQuickCaptureModalOpen] = useState(false);


    const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);

    const graphRef = useRef<SVGSVGElement>(null);

    // Expand all categories by default when tree data loads
    useEffect(() => {
        if (treeData.length > 0) {
            const catNames = new Set(treeData.map(c => c.name));
            setKanbanExpandedCats(catNames);
            
            const allSubs = new Set<string>();
            treeData.forEach(c => {
                c.children.forEach(s => allSubs.add(c.name + '-' + s.name));
            });
            setKanbanExpandedSubs(allSubs);
        }
    }, [treeData]);

    const renderGraph = useCallback(() => {
        const svg = graphRef.current;
        if (!svg) return;
        svg.innerHTML = '';

        const w = svg.clientWidth || 320;
        const h = svg.clientHeight || 200;
        const cx = w / 2;
        const cy = h / 2;

        // Helper functions
        const createLine = (x1: number, y1: number, x2: number, y2: number, color: string) => {
            const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
            l.setAttribute("x1", String(x1)); l.setAttribute("y1", String(y1));
            l.setAttribute("x2", String(x2)); l.setAttribute("y2", String(y2));
            l.setAttribute("stroke", color); l.setAttribute("stroke-width", "1");
            l.classList.add("link-line");
            svg.appendChild(l);
        };
        const createCircle = (cx: number, cy: number, r: number, color: string) => {
            const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            c.setAttribute("cx", String(cx)); c.setAttribute("cy", String(cy));
            c.setAttribute("r", String(r)); c.setAttribute("fill", color);
            c.classList.add("node-circle");
            svg.appendChild(c);
        };
        const createText = (x: number, y: number, text: string, color: string, size: number) => {
            const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t.setAttribute("x", String(x)); t.setAttribute("y", String(y));
            t.setAttribute("text-anchor", "middle");
            t.setAttribute("fill", color); t.setAttribute("font-size", String(size));
            t.textContent = text.length > 10 ? text.substring(0, 8) + '..' : text;
            t.classList.add("node-text");
            svg.appendChild(t);
        };

        let rootLabel = "DB";
        let l2Nodes: any[] = [];
        let state = currentFilter !== 'All' ? 'category' : 'root';

        if (state === 'category') {
            rootLabel = currentFilter;
            const cat = treeData.find(c => c.name === currentFilter);
            if (cat) l2Nodes = cat.children.map(s => ({ label: s.name, items: s.items }));
        }

        // Draw Level 2 Nodes
        const l2Radius = 80;
        if (l2Nodes.length > 0) {
            l2Nodes.forEach((n, i) => {
                const angle = (i / l2Nodes.length) * 2 * Math.PI;
                const x2 = cx + Math.cos(angle) * l2Radius;
                const y2 = cy + Math.sin(angle) * l2Radius;

                createLine(cx, cy, x2, y2, "#3f3f46");
                createCircle(x2, y2, 6, "#d4d4d8");
                createText(x2, y2 + 14, n.label, "#d4d4d8", 8);

                // Draw Level 3 Nodes
                if (n.items && n.items.length > 0) {
                    const itemCount = Math.min(n.items.length, 4);
                    const l3Radius = 30;
                    for (let j = 0; j < itemCount; j++) {
                        const subAngle = angle + ((j - itemCount / 2 + 0.5) * 0.6);
                        const x3 = x2 + Math.cos(subAngle) * l3Radius;
                        const y3 = y2 + Math.sin(subAngle) * l3Radius;
                        createLine(x2, y2, x3, y3, "#27272a");
                        createCircle(x3, y3, 3, "#71717a");
                    }
                }
            });
        }

        // Center Node
        const centerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const centerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        centerCircle.setAttribute("cx", String(cx)); centerCircle.setAttribute("cy", String(cy));
        centerCircle.setAttribute("r", "14"); centerCircle.setAttribute("fill", "#ffffff");
        centerCircle.classList.add("center-pulse");

        const centerText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        centerText.setAttribute("x", String(cx)); centerText.setAttribute("y", String(cy + 4));
        centerText.setAttribute("text-anchor", "middle");
        centerText.setAttribute("fill", "#000");
        centerText.setAttribute("font-size", "10");
        centerText.setAttribute("font-weight", "bold");
        centerText.textContent = rootLabel.substring(0, 4).toUpperCase();

        centerGroup.appendChild(centerCircle); centerGroup.appendChild(centerText);
        svg.appendChild(centerGroup);
    }, [currentFilter, treeData]);

    // Graph Rendering Effect
    useEffect(() => {
        renderGraph();
    }, [renderGraph]);

    const toggleSidebarCat = useCallback((name: string) => {
        setSidebarExpandedCats(prev => {
            const newSet = new Set(prev);
            if (newSet.has(name)) newSet.delete(name); else newSet.add(name);
            return newSet;
        });
    }, []);

    const toggleKanbanCat = useCallback((name: string) => {
        setKanbanExpandedCats(prev => {
            const newSet = new Set(prev);
            if (newSet.has(name)) newSet.delete(name); else newSet.add(name);
            return newSet;
        });
    }, []);

    const toggleKanbanSub = useCallback((id: string) => {
        setKanbanExpandedSubs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
            return newSet;
        });
    }, []);

    const handleUpdateView = useCallback((name: string) => {
        // Update URL to reflect new filter. 
        // If it's 'All', we can opt to remove the param or just set it. 
        // Setting it is explicit and fine.
        router.push(`/database?filter=${encodeURIComponent(name)}`);
    }, [router]);

    const handleSelectItem = useCallback((item: any) => {
        // Navigate to content detail page
        router.push(`/content/${item.id}`);
    }, [router]);

    return (
        <div className="flex h-screen w-full bg-black text-zinc-400 font-sans overflow-hidden selection:bg-white selection:text-black relative">
            {/* Left Sidebar (Library) */}
            <LibrarySidebar
                isSidebarOpen={isSidebarOpen}
                treeData={treeData}
                currentFilter={currentFilter}
                sidebarExpandedCats={sidebarExpandedCats}
                onToggleSidebarCat={toggleSidebarCat}
                onUpdateView={handleUpdateView}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative min-w-0 transition-all duration-300 bg-black">
                <DatabaseHeader
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    currentFilter={currentFilter}
                    currentDetailItem={null}
                    allItemsCount={allItems.length}
                    treeData={treeData}
                />

                <div className="flex-1 relative overflow-hidden bg-black pl-6">
                    {/* Loading State */}
                    {(contentLoading || tagsLoading) && (
                        <div className="flex h-full items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                                <p className="text-zinc-500 text-sm">Loading your content...</p>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!contentLoading && !tagsLoading && treeData.length === 0 && (
                        <div className="flex h-full items-center justify-center">
                            <div className="flex flex-col items-center gap-4 text-center max-w-md">
                                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                                    <span className="text-2xl">📚</span>
                                </div>
                                <h3 className="text-white font-semibold text-lg">No content yet</h3>
                                <p className="text-zinc-500 text-sm">
                                    Add your first piece of content using the Quick Capture button on the Dashboard.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* VIEW: ALL (KANBAN) */}
                    {!contentLoading && !tagsLoading && treeData.length > 0 && currentFilter === 'All' && (
                        <KanbanView
                            treeData={treeData}
                            kanbanExpandedCats={kanbanExpandedCats}
                            kanbanExpandedSubs={kanbanExpandedSubs}
                            onToggleKanbanCat={toggleKanbanCat}
                            onToggleKanbanSub={toggleKanbanSub}
                            onUpdateView={handleUpdateView}
                            onSelectItem={handleSelectItem}
                        />
                    )}

                    {/* VIEW: CATEGORY (SWIMLANES) */}
                    {!contentLoading && !tagsLoading && treeData.length > 0 && currentFilter !== 'All' && (
                        <SwimlanesView
                            treeData={treeData}
                            currentFilter={currentFilter}
                            onSelectItem={handleSelectItem}
                        />
                    )}
                </div>

                {/* Floating Container (Search/AI) */}
                <FloatingSearchBar
                    currentFilter={currentFilter}
                    currentDetailItem={null}
                    searchMode={searchMode}
                    onSetSearchMode={setSearchMode}
                    onOpenAddModal={() => setQuickCaptureModalOpen(true)}
                    isAiSidebarOpen={isAiSidebarOpen}
                    setAiSidebarOpen={setIsAiSidebarOpen} 
                />
            </main>

            <QuickCaptureModal
                isOpen={quickCaptureModalOpen}
                onClose={() => setQuickCaptureModalOpen(false)}
            />

            {/* Right Sidebar (Neural Map) */}
            <NeuralMapSidebar
                currentFilter={currentFilter}
                currentDetailItem={null}
                graphRef={graphRef}
                isOpen={isAiSidebarOpen}
                onClose={() => setIsAiSidebarOpen(false)}
            />
        </div>
    );
}

function DatabasePage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-black text-zinc-500">Loading Database...</div>}>
            <DatabasePageContent />
        </Suspense>
    );
}

export default memo(DatabasePage);