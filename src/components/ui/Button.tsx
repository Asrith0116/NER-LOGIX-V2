import { cn } from '@/utils';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#2563eb] text-white hover:bg-[#1d4ed8] border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.1)]',
  secondary:
    'bg-[#f5f5f4] text-[#1a1a19] hover:bg-[#e7e7e6] border-[#e4e4e3]',
  ghost:
    'bg-transparent text-[#5a5a57] hover:bg-[#f5f5f4] border-transparent',
  danger:
    'bg-[#dc2626] text-white hover:bg-[#b91c1c] border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.1)]',
  outline:
    'bg-white text-[#1a1a19] hover:bg-[#f5f5f4] border-[#e4e4e3]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded',
  md: 'px-3.5 py-2 text-sm gap-2 rounded-md',
  lg: 'px-5 py-2.5 text-sm gap-2 rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      iconLeft,
      iconRight,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          iconLeft
        )}
        {children}
        {!loading && iconRight}
      </button>
    );
  },
);

Button.displayName = 'Button';
