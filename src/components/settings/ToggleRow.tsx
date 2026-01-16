import React from 'react';
import { Switch } from '../ui/switch';

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-white/5 last:border-b-0 last:pb-0">
      <div className="flex-1 space-y-0.5">
        <p className="text-xs font-medium text-white/90">{label}</p>
        {description && (
          <p className="text-[10px] text-zinc-500">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-white/10"
      />
    </div>
  );
}
