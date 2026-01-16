import React from 'react';
import { Loader2 } from 'lucide-react';

interface AuthButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export function AuthButton({
  variant = 'primary',
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = true,
  icon,
}: AuthButtonProps) {
  const baseStyles = `
    relative h-12 px-6 rounded-xl font-medium
    transition-all duration-300 ease-out
    flex items-center justify-center gap-2
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-purple-600 to-purple-500
      hover:from-purple-500 hover:to-purple-400
      text-white
      shadow-lg shadow-purple-500/25
      hover:shadow-xl hover:shadow-purple-500/40
      hover:scale-[1.02]
      active:scale-[0.98]
    `,
    secondary: `
      bg-white/5
      hover:bg-white/10
      text-white/90
      backdrop-blur-lg
      border border-white/10
      hover:border-white/20
      hover:scale-[1.02]
      active:scale-[0.98]
    `,
    outline: `
      bg-transparent
      hover:bg-white/5
      text-white/70
      hover:text-white
      border border-white/10
      hover:border-white/20
      hover:scale-[1.02]
      active:scale-[0.98]
    `,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${disabled || loading ? '!transform-none' : ''}`}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {!loading && icon && icon}
      <span>{children}</span>
      
      {variant === 'primary' && !disabled && !loading && (
        <div
          className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
          }}
        />
      )}
    </button>
  );
}