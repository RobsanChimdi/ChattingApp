import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SettingsTabItem } from '@/types/settings.types';

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: SettingsTabItem[];
}

export function SettingsSidebar({ activeTab, onTabChange, tabs }: SettingsSidebarProps) {
  return (
    <Card className="p-4">
      <nav className="space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>
    </Card>
  );
}
