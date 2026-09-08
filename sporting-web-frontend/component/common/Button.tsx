import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  loadingText,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006241] focus-visible:ring-offset-2 select-none';

  const variantStyles = {
    primary:
      'bg-[#006241] text-[#FBF8F0] hover:bg-[#004d33] shadow-md shadow-[#006241]/20 active:bg-[#003824]',
    secondary:
      'bg-[#1E3932] text-[#FBF8F0] hover:bg-[#142823] shadow-md shadow-[#1E3932]/20 active:bg-[#0d1c18]',
    outline:
      'border-2 border-[#1E3932] text-[#1E3932] hover:bg-[#1E3932] hover:text-[#FBF8F0] active:bg-[#142823]',
    ghost:
      'text-[#1E3932] hover:bg-[#6F7E72]/15 active:bg-[#6F7E72]/25',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20 active:bg-rose-800',
  };

  const sizeStyles = {
    sm: 'text-xs min-h-[36px] px-3.5 py-1.5 gap-1.5',
    md: 'text-sm min-h-[44px] px-5 py-2.5 gap-2',
    lg: 'text-base min-h-[48px] px-7 py-3.5 gap-2.5',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          {loadingText ? <span>{loadingText}</span> : children}
        </>
      ) : (
        <>
          {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

