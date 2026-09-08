import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  dark = false,
}) => {
  return (
    <div
      className={`rounded-3xl p-6 md:p-8 transition-all duration-300 ${
        dark ? 'glass-surface-dark text-[#FBF8F0]' : 'glass-surface text-[#1E3932]'
      } ${className}`}
    >
      {children}
    </div>
  );
};
