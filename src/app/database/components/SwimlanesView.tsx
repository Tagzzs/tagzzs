"use client";

import { memo } from "react";

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
}

function SwimlanesView({
  treeData,
  currentFilter,
  onSelectItem,
}: SwimlanesViewProps) {
  return (
    <div className="flex flex-col gap-10 pb-20 overflow-y-auto px-10 h-full db-scroll">
      {treeData
        .find((c) => c.name === currentFilter)
        ?.children.map((subCat) => (
          <div key={subCat.name} className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2">
              <h3 className="text-xl font-bold text-white tracking-tight">
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
                    className="min-w-[320px] w-[320px] h-[360px] bg-[#121212] border border-zinc-800 rounded-3xl p-5 flex flex-col hover:border-zinc-700 hover:shadow-xl transition-all cursor-pointer group snap-start relative overflow-hidden"
                  >
                    <div className="h-48 w-full bg-zinc-900/50 rounded-2xl mb-4 overflow-hidden relative shrink-0 border border-zinc-900">
                      <img
                        src={item.image}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                        alt={item.title}
                      />
                    </div>
                    <div className="shrink-0 flex flex-col gap-1 flex-1 min-h-0">
                      <h4 className="text-white font-bold text-lg leading-tight group-hover:text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                        {item.desc}
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-900/50">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                          Doc
                        </span>
                        <span className="text-[10px] font-bold text-zinc-500 border border-zinc-800 px-2 py-1 rounded-md bg-black uppercase tracking-wider">
                          {(item.subCategory || "General").split(" ")[0]}
                        </span>
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
