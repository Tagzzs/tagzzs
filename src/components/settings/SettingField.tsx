import React from 'react';

interface SettingFieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingField({ label, description, children }: SettingFieldProps) {
  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <label className="text-xs font-medium text-white/90">{label}</label>
        {description && (
          <p className="text-[10px] text-zinc-500">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
