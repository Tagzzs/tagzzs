import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthInputProps {
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function AuthInput({
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  icon,
}: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="w-full">
      <div
        className={`
          relative w-full h-12 rounded-xl overflow-hidden transition-all duration-300 ease-out
          ${
            error
              ? 'ring-2 ring-red-500/50'
              : isFocused
              ? 'ring-2 ring-purple-500/50 scale-[1.01]'
              : 'ring-1 ring-white/10'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{
          background: error
            ? 'rgba(239, 68, 68, 0.05)'
            : isFocused
            ? 'rgba(168, 85, 247, 0.05)'
            : 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          boxShadow: isFocused
            ? '0 0 20px rgba(168, 85, 247, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)'
            : '0 2px 8px rgba(0, 0, 0, 0.3)',
        }}
      >
        {icon && (
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
            isFocused ? 'text-purple-400' : 'text-white/40'
          }`}>
            {icon}
          </div>
        )}
        
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full h-full bg-transparent outline-none
            text-white placeholder:text-white/30
            transition-all duration-200
            ${icon ? 'pl-12 pr-4' : 'px-4'}
            ${type === 'password' ? 'pr-12' : ''}
          `}
        />

        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-purple-400 transition-all duration-200 hover:scale-110"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-400 ml-1 animate-in fade-in duration-200">{error}</p>
      )}
    </div>
  );
}