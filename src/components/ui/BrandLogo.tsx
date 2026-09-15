import React from 'react';
import { cn } from '@/utils';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
  dark?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = false,
  className,
  onClick,
  dark = false,
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
    xl: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-xl',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 select-none',
        onClick && 'cursor-pointer hover:opacity-90 transition-opacity',
        className
      )}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Official Mountain Peak Emblem */}
      <div
        className={cn(
          'relative rounded-lg flex items-center justify-center shrink-0 shadow-xs p-1 transition-transform',
          dark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-950 border border-slate-800 shadow-sm',
          iconSizes[size]
        )}
      >
        <svg
          viewBox="0 0 72 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_1px_4px_rgba(16,185,129,0.3)]"
        >
          {/* Left Emerald Peak */}
          <path
            d="M10 40L28 10L39 28"
            stroke="#10B981"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right Cyan/Blue Peak */}
          <path
            d="M27 34L45 8L62 40"
            stroke="#06B6D4"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Base Connection line */}
          <path
            d="M20 40H52"
            stroke="#38BDF8"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'font-extrabold tracking-tight leading-none',
                dark ? 'text-white' : 'text-slate-900',
                textSizes[size]
              )}
            >
              NER-LOGIX
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5 truncate">
              Logistics &amp; Emergency Operations
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;

