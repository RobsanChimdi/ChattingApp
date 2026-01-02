import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  centered?: boolean;
  fullHeight?: boolean;
  scrollable?: boolean;
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = '2xl',
  padding = 'md',
  centered = true,
  fullHeight = false,
  scrollable = false
}: ResponsiveContainerProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(max-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: 'p-0',
    sm: isMobile ? 'p-2' : 'p-4',
    md: isMobile ? 'p-4' : 'p-6',
    lg: isMobile ? 'p-6' : 'p-8',
    xl: isMobile ? 'p-8' : 'p-12'
  };

  return (
    <div
      className={cn(
        "w-full",
        centered && "mx-auto",
        maxWidth !== 'full' && maxWidthClasses[maxWidth],
        paddingClasses[padding],
        fullHeight && "h-full",
        scrollable && "overflow-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

// Container with breakpoint-specific layouts
interface AdaptiveContainerProps {
  children: ReactNode;
  mobile?: ReactNode;
  tablet?: ReactNode;
  desktop?: ReactNode;
  className?: string;
}

export function AdaptiveContainer({
  children,
  mobile,
  tablet,
  desktop,
  className
}: AdaptiveContainerProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(max-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  let content = children;

  if (isMobile && mobile) {
    content = mobile;
  } else if (isTablet && tablet) {
    content = tablet;
  } else if (isDesktop && desktop) {
    content = desktop;
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}

// Grid container with responsive columns
interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className
}: ResponsiveGridProps) {
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const mobileCols = `grid-cols-${cols.mobile || 1}`;
  const tabletCols = `md:grid-cols-${cols.tablet || cols.mobile || 2}`;
  const desktopCols = `lg:grid-cols-${cols.desktop || cols.tablet || 3}`;

  return (
    <div
      className={cn(
        "grid",
        mobileCols,
        tabletCols,
        desktopCols,
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

// Split view container that adapts to screen size
interface ResponsiveSplitProps {
  left: ReactNode;
  right: ReactNode;
  leftWidth?: number; // Percentage for desktop
  reverseOnMobile?: boolean;
  minHeight?: string;
  className?: string;
}

export function ResponsiveSplit({
  left,
  right,
  leftWidth = 40,
  reverseOnMobile = false,
  minHeight = 'auto',
  className
}: ResponsiveSplitProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <div
        className={cn("flex flex-col", className)}
        style={{ minHeight }}
      >
        {reverseOnMobile ? (
          <>
            <div className="flex-1 overflow-hidden">{right}</div>
            <div className="flex-1 overflow-hidden border-t">{left}</div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-hidden">{left}</div>
            <div className="flex-1 overflow-hidden border-t">{right}</div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("flex", className)}
      style={{ minHeight }}
    >
      <div
        className="overflow-hidden flex-shrink-0"
        style={{ width: `${leftWidth}%` }}
      >
        {left}
      </div>
      <div className="flex-1 overflow-hidden">
        {right}
      </div>
    </div>
  );
}

// Container that shows different content based on loading/error states
interface StatefulContainerProps {
  children: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  emptyComponent?: ReactNode;
  className?: string;
}

export function StatefulContainer({
  children,
  isLoading = false,
  isError = false,
  isEmpty = false,
  loadingComponent,
  errorComponent,
  emptyComponent,
  className
}: StatefulContainerProps) {
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        {loadingComponent || (
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          </div>
        )}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        {errorComponent || (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <span className="text-destructive">!</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
            <p className="text-muted-foreground">Please try again later</p>
          </div>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        {emptyComponent || (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-muted-foreground">∅</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">No data found</h3>
            <p className="text-muted-foreground">Nothing to display here</p>
          </div>
        )}
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}