import React from 'react';

export function AuthDivider() {
  return (
    <div className="relative flex items-center justify-center my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-white/10" />
      </div>
      <div className="relative px-4 bg-[#09090b] text-xs text-white/40">
        OR
      </div>
    </div>
  );
}
