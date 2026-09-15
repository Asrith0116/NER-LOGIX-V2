import { cn } from '@/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
  selected?: boolean;
}

export function Card({ className, children, onClick, hoverable = false, selected = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white/95 backdrop-blur-[2px] border border-slate-200/80 rounded-2xl',
        'shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05),0_1px_3px_0_rgba(15,23,42,0.03)]',
        hoverable && 'cursor-pointer transition-all duration-200 hover:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.1)] hover:border-slate-300 hover:-translate-y-0.5',
        selected && 'border-blue-600 ring-2 ring-blue-500/20 shadow-md',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function CardHeader({ className, children }: CardHeaderProps) {
  return (
    <div className={cn('px-5 py-3.5 border-b border-slate-100', className)}>
      {children}
    </div>
  );
}

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export function CardContent({ className, children }: CardContentProps) {
  return (
    <div className={cn('px-5 py-4', className)}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export function CardFooter({ className, children }: CardFooterProps) {
  return (
    <div className={cn('px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl', className)}>
      {children}
    </div>
  );
}
