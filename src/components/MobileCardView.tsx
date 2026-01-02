import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MobileCardViewProps<T> {
  items: T[];
  renderCard: (item: T, index: number) => ReactNode;
  className?: string;
  emptyMessage?: string;
}

export function MobileCardView<T>({ 
  items, 
  renderCard, 
  className,
  emptyMessage = 'No items found'
}: MobileCardViewProps<T>) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => renderCard(item, index))}
    </div>
  );
}

interface MobileCardItemProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileCardItem({ children, onClick, className }: MobileCardItemProps) {
  return (
    <Card 
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50 active:bg-muted",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  );
}

interface MobileCardRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function MobileCardRow({ label, children, className }: MobileCardRowProps) {
  return (
    <div className={cn("flex justify-between items-center py-1", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{children}</span>
    </div>
  );
}