import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ChevronDown, 
  Circle, 
  Settings, 
  Moon, 
  Sun, 
  Bell, 
  Shield,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface UserProfileProps {
  collapsed?: boolean;
  showStatus?: boolean;
  showMenu?: boolean;
}

export function UserProfile({ 
  collapsed = false, 
  showStatus = true,
  showMenu = true 
}: UserProfileProps) {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className={cn(
        "flex items-center",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'busy': return 'Busy';
      case 'offline': return 'Offline';
      default: return 'Offline';
    }
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.profile_image} />
            <AvatarFallback>
              {user.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {showStatus && (
            <div className="absolute -bottom-1 -right-1">
              <div className={cn(
                "h-3 w-3 rounded-full border-2 border-background",
                getStatusColor(user.status || 'offline')
              )} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.profile_image} />
            <AvatarFallback>
              {user.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {showStatus && (
            <div className="absolute -bottom-1 -right-1">
              <div className={cn(
                "h-3 w-3 rounded-full border-2 border-background",
                getStatusColor(user.status || 'offline')
              )} />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{user.username}</p>
          {showStatus && (
            <div className="flex items-center space-x-1">
              <div className={cn(
                "h-2 w-2 rounded-full",
                getStatusColor(user.status || 'offline')
              )} />
              <span className="text-xs text-muted-foreground">
                {getStatusText(user.status || 'offline')}
              </span>
            </div>
          )}
        </div>
      </div>

      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Shield className="h-4 w-4 mr-2" />
              Privacy
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Moon className="h-4 w-4 mr-2" />
              Theme
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}