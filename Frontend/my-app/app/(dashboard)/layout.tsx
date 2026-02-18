'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Home,
  MessageSquare,
  Phone,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  BellRing,
  Radio,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { isConnected, connectionStatus } = useSocket();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(3); // Example notification count
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
      setIsCollapsed(false);
    } else {
      setIsSidebarOpen(true);
    }
  }, [isMobile]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Home,
      active: pathname === '/',
    },
    {
      name: 'Chats',
      href: '/chat',
      icon: MessageSquare,
      active: pathname === '/chat' || pathname.startsWith('/chat/'),
      badge: 5, // Unread messages count
    },
    {
      name: 'Calls',
      href: '/calls',
      icon: Phone,
      active: pathname === '/calls' || pathname.startsWith('/calls/'),
      badge: 2, // Missed calls count
    },
    {
      name: 'Contacts',
      href: '/contacts',
      icon: Users,
      active: pathname === '/contacts',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      active: pathname === '/settings',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-300 md:static",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!isCollapsed ? (
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">C</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                ChatApp
              </span>
            </Link>
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
              <span className="text-lg font-bold text-primary-foreground">C</span>
            </div>
          )}
          
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* User Info */}
        <div className="border-b p-4">
          <div className={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "space-x-3"
          )}>
            <Avatar className="h-10 w-10 ring-2 ring-primary/10">
              <AvatarImage src={user?.profile_image || ''} />
              <AvatarFallback>
                {user?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {user?.first_name 
                    ? `${user.first_name} ${user.last_name || ''}`.trim()
                    : user?.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <TooltipProvider delayDuration={0}>
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = item.active;

              if (isCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link href={item.href}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start",
                            isCollapsed ? "px-2" : "px-3",
                            isActive && "bg-secondary"
                          )}
                        >
                          <Icon className={cn(
                            "h-5 w-5",
                            isCollapsed ? "mx-auto" : "mr-3"
                          )} />

                          {isCollapsed && item.badge && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.name}
                      {item.badge && ` (${item.badge})`}
                    </TooltipContent>
                  </Tooltip>
                );
              } else {
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        isCollapsed ? "px-2" : "px-3",
                        isActive && "bg-secondary"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5",
                        isCollapsed ? "mx-auto" : "mr-3"
                      )} />

                      <span className="flex-1 text-left">{item.name}</span>
                      {item.badge && (
                        <Badge variant="default" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              }
            })}
          </TooltipProvider>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t p-4">
          <TooltipProvider delayDuration={0}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10",
                      isCollapsed && "px-2"
                    )}
                    onClick={handleLogout}
                  >
                    <LogOut className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "mr-3")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10",
                  isCollapsed && "px-2"
                )}
                onClick={handleLogout}
              >
                <LogOut className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "mr-3")} />
                <span>Logout</span>
              </Button>
            )}
          </TooltipProvider>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}

              {/* Connection Status */}
              <Badge 
                variant="outline" 
                className={cn(
                  "hidden sm:inline-flex",
                  isConnected ? "text-green-500" : "text-red-500"
                )}
              >
                {isConnected ? (
                  <>
                    <Radio className="h-3 w-3 mr-1 animate-pulse" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    {connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                  </>
                )}
              </Badge>

              {/* Page Title */}
              <span className="text-sm font-medium text-muted-foreground hidden md:inline">
                {pathname === '/' && 'Dashboard'}
                {pathname === '/chat' && 'Chats'}
                {pathname.startsWith('/chat/') && 'Chat'}
                {pathname === '/calls' && 'Calls'}
                {pathname.startsWith('/calls/') && 'Call'}
                {pathname === '/contacts' && 'Contacts'}
                {pathname === '/settings' && 'Settings'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                {notifications > 0 ? (
                  <BellRing className="h-5 w-5" />
                ) : (
                  <Bell className="h-5 w-5" />
                )}
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profile_image || ''} />
                      <AvatarFallback>
                        {user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.first_name 
                          ? `${user.first_name} ${user.last_name || ''}`.trim()
                          : user?.username}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <UserIcon className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Connection Status */}
          {isMobile && (
            <div className="border-t px-4 py-2 bg-muted/50">
              <Badge 
                variant="outline" 
                className={cn(
                  "w-full justify-center",
                  isConnected ? "text-green-500" : "text-red-500"
                )}
              >
                {isConnected ? (
                  <>
                    <Radio className="h-3 w-3 mr-1 animate-pulse" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    {connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                  </>
                )}
              </Badge>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}