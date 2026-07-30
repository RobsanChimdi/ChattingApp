'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { SettingsSidebar } from '@/components/settings/settings-sidebar';
import { ProfileForm } from '@/components/settings/profile-form';
import {
  Settings,
  User,
  Bell,
  Shield,
  Globe,
  Loader2,
  LogOut
} from 'lucide-react';
import type { SettingsFormData, SettingsTab } from '@/types/settings.types';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { updateProfile, isLoading: isUpdating } = useSettings();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  
  const [formData, setFormData] = useState<SettingsFormData>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    bio: '',
    phone_number: '',
    status: '',
    privacy_last_seen: 'everyone'
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        bio: user.bio || '',
        phone_number: user.phone_number || '',
        status: user.status || '',
        privacy_last_seen: user.privacy_last_seen || 'everyone'
      });
      setPreviewImage(user.profile_image || '');
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = new FormData();
      data.append('username', formData.username);
      data.append('email', formData.email);
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('bio', formData.bio);
      data.append('phone_number', formData.phone_number);
      data.append('status', formData.status);
      data.append('privacy_last_seen', formData.privacy_last_seen);
      
      if (profileImage) {
        data.append('profile_image', profileImage);
      }
      
      await updateProfile(data);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'privacy' as const, label: 'Privacy', icon: Globe },
    { id: 'security' as const, label: 'Security', icon: Shield },
  ];

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <SettingsSidebar 
          activeTab={activeTab} 
          onTabChange={(tab: string) => setActiveTab(tab as SettingsTab)} 
          tabs={tabs} 
        />

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>
              <ProfileForm
                formData={formData}
                onChange={setFormData}
                onSubmit={handleSubmit}
                isLoading={isUpdating}
                previewImage={previewImage}
                onImageChange={handleImageChange}
              />
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Notification Settings</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Notification settings will be implemented soon.
                </p>
              </div>
            </Card>
          )}

          {activeTab === 'privacy' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Privacy Settings</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="privacy_last_seen">Last Seen Visibility</Label>
                  <select
                    id="privacy_last_seen"
                    value={formData.privacy_last_seen}
                    onChange={(e) => setFormData({ ...formData, privacy_last_seen: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">Contacts Only</option>
                    <option value="nobody">Nobody</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Control who can see when you were last online.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Security Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Change Password</h3>
                  <Button variant="outline" onClick={() => router.push('/forgot-password')}>
                    Change Password
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2 text-destructive">Danger Zone</h3>
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
