"use client";

import { memo } from "react";
import { Tag } from "@/hooks/useTags";
import { Image as ImageIcon } from "@phosphor-icons/react";

interface TreeNode {
  name: string;
  children: {
    name: string;
    items: any[];
  }[];
}

interface SwimlanesViewProps {
  treeData: TreeNode[];
  currentFilter: string;
  onSelectItem: (item: any) => void;
  tagsMap: Map<string, Tag>;
}

function SwimlanesView({
  treeData,
  currentFilter,
  onSelectItem,
  tagsMap,
}: SwimlanesViewProps) {
  return (
    <div className="flex flex-col gap-10 pb-20 overflow-y-auto px-4 md:px-10 h-full db-scroll">
      {treeData
        .find((c) => c.name === currentFilter)
        ?.children.map((subCat) => (
          <div key={subCat.name} className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2">
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                {subCat.name}
              </h3>
              <span className="text-xs text-zinc-600 font-bold">
                {subCat.items.length} items
              </span>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-6 hide-scroll snap-x items-stretch">
              {subCat.items.length === 0 ? (
                <div className="text-sm text-zinc-700 italic px-2">
                  No items in this collection.
                </div>
              ) : (
                subCat.items.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="min-w-[85vw] sm:min-w-[280px] md:min-w-[320px] w-[85vw] sm:w-[280px] md:w-[320px] h-[360px] bg-[#121212] border border-zinc-800 rounded-3xl p-5 flex flex-col hover:border-zinc-700 hover:shadow-xl transition-all cursor-pointer group snap-start relative overflow-hidden"
                  >
                    <div className="h-48 w-full bg-zinc-900/50 rounded-2xl mb-4 overflow-hidden relative shrink-0 border border-zinc-900 flex items-center justify-center">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                          alt={item.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                            (
                              e.target as HTMLImageElement
                            ).nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-700 gap-2">
                          <ImageIcon size={32} />
                          <span className="text-xs font-medium">
                            No Preview
                          </span>
                        </div>
                      )}

                      {/* Fallback for error loading image - hidden by default unless img fails (managed via ref or simple double render strategy, but straightforward conditional is cleaner. If img fails, simple UI handler is hard in react without state. Simple check: if thumbnailUrl exists, try to show it. If we want a robust fallback on error, we need state. For now, strict 'if url exists'.) */}
                    </div>
                    <div className="shrink-0 flex flex-col gap-1 flex-1 min-h-0">
                      <h4 className="text-white font-bold text-lg leading-tight group-hover:text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                        {item.description || item.desc}
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-900/50">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest truncate max-w-[30%]">
                          {item.contentType || "DOC"}
                        </span>

                        <div className="flex gap-1 flex-wrap justify-end max-w-[65%] overflow-hidden h-6">
                          {item.tagsId && item.tagsId.length > 0 ? (
                            item.tagsId.map((tagId: string) => {
                              const tag = tagsMap.get(tagId);
                              if (!tag) return null;
                              return (
                                <span
                                  key={tagId}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-400 whitespace-nowrap"
                                  style={{ color: tag.tagColor }}
                                >
                                  {tag.tagName}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-700">
                              No Tags
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
    </div>
  );
}

export default memo(SwimlanesView);
