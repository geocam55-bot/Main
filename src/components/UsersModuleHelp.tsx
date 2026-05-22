import { Plus, RefreshCw, Search, Shield, Users } from 'lucide-react';
import { InteractiveModuleHelp } from './InteractiveModuleHelp';

interface UsersModuleHelpProps {
  userId: string;
  totalUsers: number;
  canManageUsers: boolean;
  onOpenUsersTab: () => void;
  onOpenPermissionsTab: () => void;
  onOpenRecoveryTab: () => void;
  onRefreshUsers: () => void;
  onFindMissingUsers: () => void;
  onOpenInviteUser: () => void;
}

export function UsersModuleHelp({
  userId,
  totalUsers,
  canManageUsers,
  onOpenUsersTab,
  onOpenPermissionsTab,
  onOpenRecoveryTab,
  onRefreshUsers,
  onFindMissingUsers,
  onOpenInviteUser,
}: UsersModuleHelpProps) {
  const processStages = 'Discovery -> Scope Lock -> Estimate -> Approval -> Handoff';

  return (
    <InteractiveModuleHelp
      moduleKey="users-help"
      userId={userId}
      title="Users Module Interactive Help"
      description="Manage team access safely, validate account ownership, and hand off permission-ready user operations."
      moduleIcon={Users}
      triggerLabel="Users Help"
      steps={[
        {
          title: 'Discovery and Scope Lock',
          body: 'Start from User Management to verify account inventory and organizational alignment.',
        },
        {
          title: 'Estimate and Validate',
          body: 'Use access and recovery views to validate role design, missing profiles, and operational readiness.',
        },
        {
          title: 'Approval and Handoff',
          body: 'Apply approved account changes and confirm recoverability before handoff to operations.',
        },
      ]}
      badges={[
        { label: 'Users In Scope', value: totalUsers },
        { label: 'Manage Access', value: canManageUsers ? 'Enabled' : 'View only' },
        { label: 'Workflow', value: processStages, variant: 'outline' },
      ]}
      actions={[
        { label: 'Open User Management', icon: Users, variant: 'outline', onClick: onOpenUsersTab },
        { label: 'Open Space Access', icon: Shield, variant: 'outline', onClick: onOpenPermissionsTab },
        { label: 'Open User Recovery', icon: Search, variant: 'outline', onClick: onOpenRecoveryTab },
        { label: 'Show Latest Users', icon: RefreshCw, variant: 'outline', onClick: onRefreshUsers },
        { label: 'Show Missing Users', icon: Search, variant: 'outline', onClick: onFindMissingUsers },
        { label: 'Open Invite User Form', icon: Plus, onClick: onOpenInviteUser, fullWidth: true },
      ]}
      howToGuides={[
        {
          title: 'How to onboard a new user safely',
          steps: [
            'Discovery: Open User Management and verify organization context.',
            'Scope Lock: Confirm role, invite method, and organization assignment.',
            'Estimate: Validate access impact and recovery readiness.',
            'Approval: Invite user and confirm credentials flow.',
            'Handoff: Verify first-login and permission alignment with the manager.',
          ],
        },
      ]}
    />
  );
}
