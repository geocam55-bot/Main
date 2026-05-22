import { ReactNode } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Lock } from 'lucide-react';
import type { User } from '../App';
import { ALL_SPACES, canAccessSpace, canView, canAdd, canChange, canDelete } from '../utils/permissions';

interface PermissionGateProps {
  user: User;
  module: string;
  action?: 'view' | 'add' | 'change' | 'delete';
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ user, module, action = 'view', children, fallback }: PermissionGateProps) {
  // Safety check: if user is not defined, deny access
  if (!user || !user.role) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-96">
        <Alert variant="destructive" className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Authentication required. Please log in to continue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  let hasPermission = false;
  const moduleSpaces = ALL_SPACES.filter((space) => space.modules.includes(module));
  const hasViewViaSpace = moduleSpaces.some((space) => canAccessSpace(space.id, user.role, 'view'));

  switch (action) {
    case 'view':
      hasPermission = canView(module, user.role) || hasViewViaSpace;
      break;
    case 'add':
      hasPermission = canAdd(module, user.role);
      break;
    case 'change':
      hasPermission = canChange(module, user.role);
      break;
    case 'delete':
      hasPermission = canDelete(module, user.role);
      break;
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-96">
        <Alert variant="destructive" className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to {action} {module}. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}

interface PermissionButtonProps {
  user: User;
  module: string;
  action: 'add' | 'change' | 'delete';
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function PermissionButton({ user, module, action, children, ...props }: PermissionButtonProps) {
  // Safety check: if user is not defined, don't render the button
  if (!user || !user.role) {
    return null;
  }

  let hasPermission = false;

  switch (action) {
    case 'add':
      hasPermission = canAdd(module, user.role);
      break;
    case 'change':
      hasPermission = canChange(module, user.role);
      break;
    case 'delete':
      hasPermission = canDelete(module, user.role);
      break;
  }

  if (!hasPermission) {
    return null;
  }

  return <>{children}</>;
}
