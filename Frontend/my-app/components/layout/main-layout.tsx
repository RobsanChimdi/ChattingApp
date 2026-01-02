import { ReactNode, useState, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { 
  Menu, 
  X,
  MessageSquare,
  Phone,
  Users,
  Settings,
  Bell
} from 'lucide-react';
import { usePathname } from 'next/navigation';

interface MainLayoutProps {
  children: ReactNode;
  sidebarContent?: ReactNode;
  headerContent?: ReactNode;
  showSidebar?: boolean;
  sidebarWidth?: number;
  collapsibleSidebar?: boolean;
  onSidebarToggle?: (open: boolean) => void;
}

export function MainLayout({
  children,
  sidebarContent,
  headerContent,
  showSidebar = true,
  sidebarWidth = 320,
  collapsibleSidebar = true,
  onSidebarToggle
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  const handleSidebarToggle = (open: boolean) => {
    setSidebarOpen(open);
    onSidebarToggle?.(open);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Get current page title
  const getPageTitle = () => {
    if (pathname.startsWith('/chat')) return 'Chats';
    if (pathname.startsWith('/call')) return 'Calls';
    if (pathname.startsWith('/contacts')) return 'Contacts';
    if (pathname.startsWith('/settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar sheet */}
      {isMobile && sidebarContent && (
        <Sheet open={sidebarOpen} onOpenChange={handleSidebarToggle}>
          <SheetContent side="left" className="p-0 w-[280px] sm:w-[320px]">
            <div className="h-full">
              {sidebarContent}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop sidebar */}
      {!isMobile && showSidebar && sidebarContent && (
        <div
          className={cn(
            "h-full border-r bg-sidebar transition-all duration-300 ease-in-out overflow-hidden",
            isCollapsed && collapsibleSidebar ? "w-16" : `w-[${sidebarWidth}px]`
          )}
          style={{ width: isCollapsed && collapsibleSidebar ? '64px' : `${sidebarWidth}px` }}
        >
          {sidebarContent}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          {/* Mobile menu button */}
          {isMobile && sidebarContent && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleSidebarToggle(!sidebarOpen)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Desktop collapse button */}
          {!isMobile && collapsibleSidebar && sidebarContent && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              className="hidden md:flex"
            >
              {isCollapsed ? (
                <Menu className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" />
              )}
            </Button>
          )}

          {/* Page title */}
          <div className="flex-1">
            <h1 className="text-lg font-semibold md:text-xl">
              {getPageTitle()}
            </h1>
            {headerContent && (
              <div className="hidden md:block mt-1">
                {headerContent}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                3
              </span>
            </Button>
            
            <Button variant="ghost" size="icon">
              <Users className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        {isMobile && (
          <div className="sticky bottom-0 z-40 flex h-16 items-center border-t bg-background px-4 md:hidden">
            <nav className="flex w-full justify-around">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "flex flex-col items-center gap-1",
                  pathname.startsWith('/chat') && "text-primary"
                )}
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs">Chats</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "flex flex-col items-center gap-1",
                  pathname.startsWith('/call') && "text-primary"
                )}
              >
                <Phone className="h-5 w-5" />
                <span className="text-xs">Calls</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "flex flex-col items-center gap-1",
                  pathname.startsWith('/contacts') && "text-primary"
                )}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs">Contacts</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "flex flex-col items-center gap-1",
                  pathname.startsWith('/settings') && "text-primary"
                )}
              >
                <Settings className="h-5 w-5" />
                <span className="text-xs">Settings</span>
              </Button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

// Layout variant with split view (chat style)
interface SplitLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  leftPanelWidth?: number;
  rightPanelWidth?: number;
  minPanelWidth?: number;
  showDivider?: boolean;
  resizable?: boolean;
}

export function SplitLayout({
  leftPanel,
  rightPanel,
  leftPanelWidth = 320,
  rightPanelWidth = 400,
  minPanelWidth = 240,
  showDivider = true,
  resizable = true
}: SplitLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(leftPanelWidth);
  const [isResizing, setIsResizing] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!resizable) return;
    e.preventDefault();
    setIsResizing(true);

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      if (newWidth >= minPanelWidth && newWidth <= window.innerWidth - minPanelWidth) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (isMobile) {
    return (
      <div className="flex h-full overflow-hidden">
        <div className="flex-1 h-full overflow-hidden">
          {leftPanel}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div
        className="h-full overflow-hidden flex-shrink-0"
        style={{ width: `${leftWidth}px` }}
      >
        {leftPanel}
      </div>

      {/* Resizer */}
      {showDivider && resizable && (
        <div
          className={cn(
            "w-1 cursor-col-resize bg-border hover:bg-primary transition-colors relative group",
            isResizing && "bg-primary"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-border group-hover:bg-primary" />
        </div>
      )}

      {/* Right panel */}
      <div className="flex-1 h-full overflow-hidden">
        {rightPanel}
      </div>
    </div>
  );
}

// Layout for chat application
export function ChatLayout({
  chatList,
  chatWindow,
  userProfile
}: {
  chatList: ReactNode;
  chatWindow: ReactNode;
  userProfile?: ReactNode;
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [showChatList, setShowChatList] = useState(true);
  const [showUserProfile, setShowUserProfile] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      setShowChatList(true);
    }
  }, [isMobile]);

  if (isMobile) {
    return (
      <div className="flex h-full overflow-hidden">
        {showChatList ? (
          <div className="flex-1 h-full overflow-hidden">
            {chatList}
          </div>
        ) : (
          <div className="flex-1 h-full overflow-hidden">
            {chatWindow}
          </div>
        )}
      </div>
    );
  }

  return (
    <SplitLayout
      leftPanel={chatList}
      rightPanel={
        <div className="flex h-full">
          <div className="flex-1 h-full overflow-hidden">
            {chatWindow}
          </div>
          {userProfile && (
            <>
              <div className="w-1 bg-border" />
              <div className="w-80 h-full overflow-hidden">
                {userProfile}
              </div>
            </>
          )}
        </div>
      }
      leftPanelWidth={380}
      minPanelWidth={280}
      resizable={true}
    />
  );
}

// Layout for call interface
export function CallLayout({
  participants,
  controls,
  sidebar,
  primaryView = 'grid',
  showSidebar = true
}: {
  participants: ReactNode;
  controls: ReactNode;
  sidebar?: ReactNode;
  primaryView?: 'grid' | 'focus' | 'presenter';
  showSidebar?: boolean;
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Participants view */}
        <div className="flex-1 overflow-hidden bg-black">
          {participants}
        </div>

        {/* Controls */}
        <div className="border-t">
          {controls}
        </div>

        {/* Mobile sidebar drawer */}
        {sidebar && (
          <div className="absolute inset-y-0 right-0 w-64 bg-background border-l transform translate-x-full transition-transform">
            {sidebar}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main call area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Participants view */}
        <div className="flex-1 overflow-hidden bg-black relative">
          {participants}
          
          {/* Fullscreen toggle */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4 z-10"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <span className="text-xs">Exit FS</span>
            ) : (
              <span className="text-xs">Fullscreen</span>
            )}
          </Button>
        </div>

        {/* Controls */}
        <div className="border-t">
          {controls}
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && sidebar && (
        <>
          <div className="w-1 bg-border" />
          <div className="w-80 h-full overflow-hidden">
            {sidebar}
          </div>
        </>
      )}
    </div>
  );
}