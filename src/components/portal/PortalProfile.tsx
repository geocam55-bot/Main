import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Save,
  Loader2,
  Edit,
  CheckCircle2,
} from 'lucide-react';
import { updatePortalProfile, getPortalUser, portalLogout } from '../../utils/portal-client';
import { toast } from 'sonner@2.0.3';

interface PortalProfileProps {
  contact: any;
  onRefresh: () => void;
  onLogout: () => void;
}

export function PortalProfile({ contact, onRefresh, onLogout }: PortalProfileProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState(contact?.phone || '');
  const [address, setAddress] = useState(contact?.address || '');
  const [company, setCompany] = useState(contact?.company || '');

  useEffect(() => {
    if (contact) {
      setPhone(contact.phone || '');
      setAddress(contact.address || '');
      setCompany(contact.company || '');
    }
  }, [contact]);

  const portalUser = getPortalUser();

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePortalProfile({ phone, address, company });
      toast.success('Profile updated successfully');
      setEditing(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await portalLogout();
    } catch {
      // ignore
    }
    onLogout();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Your Profile</h2>
        <p className="text-muted-foreground text-sm mt-1">View and update your contact information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold">
                {(contact?.name || portalUser?.name || 'C')[0]?.toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-xl">{contact?.name || portalUser?.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{portalUser?.email || contact?.email}</p>
              </div>
            </div>
            {!editing && (
              <Button variant="outline" onClick={() => setEditing(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Read-only Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Full Name
              </Label>
              <p className="text-sm font-medium text-foreground px-3 py-2 bg-muted rounded-lg">
                {contact?.name || 'Not set'}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email
              </Label>
              <p className="text-sm font-medium text-foreground px-3 py-2 bg-muted rounded-lg">
                {contact?.email || portalUser?.email || 'Not set'}
              </p>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="profile-phone" className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Phone
              </Label>
              {editing ? (
                <Input
                  id="profile-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your phone number"
                />
              ) : (
                <p className="text-sm font-medium text-foreground px-3 py-2 bg-muted rounded-lg">
                  {contact?.phone || 'Not set'}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-company" className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5" />
                Company
              </Label>
              {editing ? (
                <Input
                  id="profile-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Your company name"
                />
              ) : (
                <p className="text-sm font-medium text-foreground px-3 py-2 bg-muted rounded-lg">
                  {contact?.company || 'Not set'}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="profile-address" className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Address
            </Label>
            {editing ? (
              <Input
                id="profile-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Your address"
              />
            ) : (
              <p className="text-sm font-medium text-foreground px-3 py-2 bg-muted rounded-lg">
                {contact?.address || 'Not set'}
              </p>
            )}
          </div>

          {/* Save/Cancel */}
          {editing && (
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setPhone(contact?.phone || '');
                  setAddress(contact?.address || '');
                  setCompany(contact?.company || '');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Sign Out</p>
              <p className="text-xs text-muted-foreground">End your portal session</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
