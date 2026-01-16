"use client";

import { memo, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretRight, SidebarSimple, FileText } from "@phosphor-icons/react";

interface TreeNode {
  name: string;
  tagId?: string;
  children: {
    name: string;
    tagId?: string;
    items: any[];
  }[];
}

interface LibrarySidebarProps {
  isSidebarOpen: boolean;
  treeData: TreeNode[];
  currentFilter: string;
  sidebarExpandedCats: Set<string>;
  onToggleSidebarCat: (name: string) => void;
  onUpdateView: (name: string) => void;
  onToggleSidebar?: () => void;
}

function LibrarySidebar({
  isSidebarOpen,
  treeData,
  currentFilter,
  sidebarExpandedCats,
  onToggleSidebarCat,
  onUpdateView,
  onToggleSidebar,
}: LibrarySidebarProps) {
  const router = useRouter();
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());

  const toggleSub = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContentClick = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    router.push(`/content/${itemId}`);
  };

  return (
    <aside
      id="left-sidebar"
      className={`bg-black/95 md:bg-black border-r border-zinc-900 flex flex-col flex-shrink-0 z-40 overflow-hidden absolute inset-y-0 left-0 md:relative h-full transition-all duration-300 ${
        isSidebarOpen ? "w-64 border-r" : "w-0 border-r-0"
      }`}
    >
      <div className="p-8 pb-4 shrink-0 flex items-center justify-between">
        <h1
          className="text-white font-black tracking-widest text-lg uppercase flex items-center gap-2 cursor-pointer"
          onClick={() => onUpdateView("All")}
        >
          <div className="w-2 h-2 rounded-full bg-white"></div> LIBRARY
        </h1>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="text-zinc-500 hover:text-white transition-colors p-1"
            title="Close Sidebar"
          >
            <SidebarSimple weight="bold" />
          </button>
        )}
      </div>
      <nav className="px-6 pb-2 space-y-1 shrink-0">
        <button
          onClick={() => onUpdateView("All")}
          className="w-full flex items-center gap-3 py-2 rounded transition text-sm text-zinc-400 hover:text-white font-bold text-left pl-0 group"
        >
          <span className="group-hover:text-white">Root</span>
        </button>
      </nav>
      <div className="flex-1 overflow-y-auto px-0 font-sans text-sm relative db-scroll">
        {treeData.map((cat) => {
          const isActive = currentFilter === cat.name;
          const isExpanded = sidebarExpandedCats.has(cat.name);
          return (
            <div key={cat.name} className="mb-1 relative">
              <button
                onClick={() => onUpdateView(cat.name)}
                className={`w-full text-left py-1.5 px-2 text-sm font-semibold flex items-center gap-2 transition-colors z-10 relative ${
                  isActive
                    ? "text-white bg-zinc-900/50"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSidebarCat(cat.name);
                  }}
                  className="p-0.5 rounded hover:bg-zinc-800"
                >
                  <CaretRight
                    weight="bold"
                    className={`text-xs transition-transform duration-200 ${
                      isExpanded ? "rotate-90 text-white" : "text-zinc-600"
                    }`}
                  />
                </div>
                <span>{cat.name}</span>
              </button>
              {isExpanded && (
                <div className="flex flex-col ml-[5px] border-l border-zinc-800">
                  {cat.children.map((sub, idx) => {
                    const subId = sub.tagId || `${cat.name}-${sub.name}-${idx}`;
                    const isSubExpanded = expandedSubs.has(subId);
                    const hasItems = sub.items && sub.items.length > 0;

                    // If empty name, render items directly
                    if (!sub.name) {
                      return (
                        <div key={subId} className="flex flex-col">
                          {sub.items.map((item) => (
                            <button
                              key={item.id}
                              onClick={(e) => handleContentClick(e, item.id)}
                              className="text-left py-1 pl-8 pr-2 text-xs font-medium text-zinc-500 hover:text-white hover:bg-white/5 rounded-r transition-colors truncate flex items-center gap-2"
                            >
                              <FileText className="text-zinc-600" />
                              <span className="truncate">
                                {item.title || "Untitled"}
                              </span>
                            </button>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <div key={subId} className="flex flex-col">
                        <div
                          className="flex items-center gap-1 py-1 pl-4 pr-2 hover:bg-white/5 rounded-r transition-colors cursor-pointer group"
                          onClick={(e) =>
                            hasItems ? toggleSub(e, subId) : undefined
                          }
                        >
                          <CaretRight
                            weight="bold"
                            className={`text-[10px] text-zinc-600 transition-transform duration-200 ${
                              isSubExpanded ? "rotate-90 text-zinc-400" : ""
                            } ${
                              !hasItems
                                ? "opacity-0"
                                : "group-hover:text-zinc-400"
                            }`}
                          />
                          <span
                            className="text-xs font-medium text-zinc-500 group-hover:text-zinc-300 truncate select-none flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSub(e, subId);
                            }}
                          >
                            {sub.name}
                          </span>
                        </div>

                        {isSubExpanded && hasItems && (
                          <div className="flex flex-col ml-4 border-l border-zinc-800/50">
                            {sub.items.map((item) => (
                              <button
                                key={item.id}
                                onClick={(e) => handleContentClick(e, item.id)}
                                className="text-left py-1 pl-4 pr-2 text-xs font-medium text-zinc-500 hover:text-white hover:bg-white/5 rounded-r transition-colors truncate flex items-center gap-2"
                              >
                                <FileText className="text-zinc-600" size={12} />
                                <span className="truncate">
                                  {item.title || "Untitled"}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default memo(LibrarySidebar);
