import React from 'react';

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className = '' }: AuthCardProps) {
  return (
    <div
      className={`
        relative w-full max-w-md rounded-2xl overflow-hidden
        ${className}
      `}
      style={{
        background: 'rgba(9, 9, 11, 0.6)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.05),
          0 0 80px rgba(139, 92, 246, 0.08)
        `,
      }}
    >
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, transparent 50%, rgba(99, 102, 241, 0.05) 100%)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 p-8 md:p-10">
        {children}
      </div>
    </div>
  );
}
