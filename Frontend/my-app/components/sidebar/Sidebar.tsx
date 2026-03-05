import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Home, 
  MessageSquare, 
  Phone, 
  Users, 
  Settings, 
  Star,
  Clock,
  Archive,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import { UserProfile } from './user-profile';
import { ChatSearch } from './chat-search';
import { ContactsList } from './contacts-list';

interface SidebarProps {
  variant?: 'default' | 'compact' | 'floating';
  position?: 'left' | 'right';
  width?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  children?: ReactNode;
}

export function Sidebar({
  variant = 'default',
  position = 'left',
  width = 280,
  collapsible = true,
  defaultCollapsed = false,
  onCollapse,
  children
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [activeSection, setActiveSection] = useState('chats');

  const handleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onCollapse?.(newCollapsed);
  };

  const sidebarContent = children || (
    <>
      {/* User profile */}
      <div className="p-4 border-b">
        <UserProfile collapsed={collapsed} />
      </div>

      {/* Search */}
      <div className="p-4">
        <ChatSearch collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <div className="px-2">
        <nav className="space-y-1">
          {[
            { id: 'chats', label: 'Chats', icon: MessageSquare, count: 3 },
            { id: 'calls', label: 'Calls', icon: Phone, count: 5 },
            { id: 'contacts', label: 'Contacts', icon: Users },
            { id: 'favorites', label: 'Favorites', icon: Star },
            { id: 'archived', label: 'Archived', icon: Archive },
            { id: 'recent', label: 'Recent', icon: Clock },
          ].map((item) => (
            <Button
              key={item.id}
              variant={activeSection === item.id ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start",
                collapsed ? "px-2" : "px-3"
              )}
              onClick={() => setActiveSection(item.id)}
            >
              <item.icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count && (
                    <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center">
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </Button>
          ))}
        </nav>
      </div>

      <Separator className="my-4" />

      {/* Contacts list */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2">
            <ContactsList collapsed={collapsed} />
          </div>
        </ScrollArea>
      </div>

      {/* Bottom actions */}
      <div className="p-4 border-t">
        <div className="space-y-2">
          <Button
            variant="outline"
            className={cn("w-full justify-start", collapsed && "px-2")}
          >
            <Settings className={cn("h-4 w-4", !collapsed && "mr-2")} />
            {!collapsed && "Settings"}
          </Button>
          <Button
            variant="ghost"
            className={cn("w-full justify-start text-destructive", collapsed && "px-2")}
          >
            <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
            {!collapsed && "Logout"}
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <aside
      className={cn(
        "h-full flex flex-col bg-sidebar border-r transition-all duration-300 ease-in-out",
        variant === 'floating' && "shadow-lg",
        position === 'right' && "border-l border-r-0",
        collapsed && collapsible && "overflow-hidden"
      )}
      style={{ width: collapsed && collapsible ? 64 : width }}
    >
      {/* Collapse button */}
      {collapsible && (
        <div className="absolute -right-3 top-6 z-10">
          <Button
            variant="secondary"
            size="icon"
            className="h-6 w-6 rounded-full border shadow-md"
            onClick={handleCollapse}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>
      )}

      {/* Sidebar content */}
      <div className="flex-1 overflow-hidden">
        {sidebarContent}
      </div>
    </aside>
  );
}

// Floating sidebar for modals/drawers
export function FloatingSidebar({
  children,
  open,
  onOpenChange,
  position = 'right'
}: {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: 'left' | 'right';
}) {
  return (
    <div
      className={cn(
        "fixed inset-y-0 z-50 w-80 bg-sidebar border-l shadow-lg transition-transform duration-300 ease-in-out",
        position === 'left' ? "border-r" : "border-l",
        open ? "translate-x-0" : position === 'left' ? "-translate-x-full" : "translate-x-full"
      )}
    >
      <div className="h-full">
        {children}
      </div>
    </div>
  );
}

// Sidebar section with header
export function SidebarSection({
  title,
  action,
  children,
  collapsed,
  className
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  collapsed?: boolean;
  className?: string;
}) {
  if (collapsed) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// Sidebar item component
export function SidebarItem({
  icon: Icon,
  label,
  badge,
  active = false,
  collapsed = false,
  onClick,
  className
}: {
  icon: any;
  label: string;
  badge?: string | number;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      className={cn(
        "w-full justify-start group",
        collapsed ? "px-2" : "px-3",
        className
      )}
      onClick={onClick}
    >
      <Icon className={cn(
        "h-4 w-4 flex-shrink-0",
        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        !collapsed && "mr-2"
      )} />
      
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          {badge && (
            <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full h-5 min-w-5 flex items-center justify-center px-1">
              {badge}
            </span>
          )}
        </>
      )}
      
      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {label}
          {badge && ` (${badge})`}
        </div>
      )}
    </Button>
  );
}