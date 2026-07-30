import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Loader2, Save } from 'lucide-react';
import type { SettingsFormData } from '@/types/settings.types';

interface ProfileFormProps {
  formData: SettingsFormData;
  onChange: (data: SettingsFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  previewImage: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileForm({ 
  formData, 
  onChange, 
  onSubmit, 
  isLoading, 
  previewImage, 
  onImageChange 
}: ProfileFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Profile Image */}
      <div className="flex items-center space-x-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={previewImage || undefined} />
          <AvatarFallback className="text-2xl">
            {formData.username?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <Label htmlFor="profile-image" className="cursor-pointer">
            <Button type="button" variant="outline" size="sm" asChild>
              <span>
                <Camera className="h-4 w-4 mr-2" />
                Change Photo
              </span>
            </Button>
          </Label>
          <Input
            id="profile-image"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onImageChange}
          />
          <p className="text-xs text-muted-foreground mt-2">
            JPG, PNG or GIF. Max size 2MB.
          </p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => onChange({ ...formData, username: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => onChange({ ...formData, email: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => onChange({ ...formData, first_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => onChange({ ...formData, last_name: e.target.value })}
          />
        </div>
      </div>

      {/* Additional Info */}
      <div className="space-y-2">
        <Label htmlFor="phone_number">Phone Number</Label>
        <Input
          id="phone_number"
          type="tel"
          value={formData.phone_number}
          onChange={(e) => onChange({ ...formData, phone_number: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Input
          id="status"
          placeholder="Hey there! I'm using ChatApp"
          value={formData.status}
          onChange={(e) => onChange({ ...formData, status: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Tell us about yourself"
          value={formData.bio}
          onChange={(e) => onChange({ ...formData, bio: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
