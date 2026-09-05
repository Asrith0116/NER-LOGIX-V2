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
        'bg-white border border-[#e4e4e3] rounded-lg',
        'shadow-[0_1px_3px_0_rgba(0,0,0,0.06),0_1px_2px_-1px_rgba(0,0,0,0.04)]',
        hoverable && 'cursor-pointer transition-shadow duration-150 hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.08)]',
        selected && 'border-[#2563eb] ring-1 ring-[#2563eb] ring-offset-0',
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
    <div className={cn('px-4 py-3 border-b border-[#e4e4e3]', className)}>
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
    <div className={cn('px-4 py-3', className)}>
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
    <div className={cn('px-4 py-2.5 border-t border-[#e4e4e3] bg-[#fafaf9] rounded-b-lg', className)}>
      {children}
    </div>
  );
}
