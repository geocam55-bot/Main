import React from 'react';
import { KitchenPlannerV2 } from '../kitchen/KitchenPlannerV2';
import { PermissionGate } from '../PermissionGate';
import { Monitor, Smartphone } from 'lucide-react';
import type { User } from '../../App';

interface KitchenPlannerProps {
  user: User;
}

export function KitchenPlanner({ user }: KitchenPlannerProps) {
  return (
    <PermissionGate user={user} module="kitchen-planner" action="view">
      {/* Mobile restriction message */}
      <div className="lg:hidden flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
        <div className="relative">
          <div className="bg-muted p-4 rounded-full">
            <Monitor className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-background p-1 rounded-full shadow-sm">
            <Smartphone className="w-6 h-6 text-red-500" />
          </div>
        </div>
        <div className="max-w-md space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">Desktop Only</h2>
          <p className="text-muted-foreground leading-relaxed">
            Due to the size restrictions of mobile displays, the Kitchen Planner requires a larger screen space for precision design. 
            For the best experience, please access this feature on your desktop or laptop computer.
          </p>
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden lg:block h-full">
        <KitchenPlannerV2 user={user} />
      </div>
    </PermissionGate>
  );
}