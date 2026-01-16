import React from 'react';

interface SettingsCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsCard({ title, description, children, className = '' }: SettingsCardProps) {
  return (
    <div className={`glass-panel bg-[#050505] p-6 space-y-6 ${className}`}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description && (
          <p className="text-xs text-zinc-500">{description}</p>
        )}
      </div>
      <div className="space-y-5">
        {children}
      </div>
    </div>
  );
}
