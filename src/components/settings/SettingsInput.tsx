import React, { useState } from 'react';

interface SettingsInputProps {
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SettingsInput({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  className = '',
}: SettingsInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={`
        relative w-full h-10 rounded-xl overflow-hidden transition-all duration-200
        ${
          isFocused
            ? 'ring-1 ring-white/20'
            : 'ring-1 ring-white/10'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
      }}
    >
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full h-full bg-transparent outline-none px-3.5 text-sm text-white placeholder:text-white/30 ${className}`}
      />
    </div>
  );
}
