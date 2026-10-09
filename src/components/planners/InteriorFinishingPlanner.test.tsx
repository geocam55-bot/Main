import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InteriorFinishingPlanner } from './InteriorFinishingPlanner';

vi.mock('../PermissionGate', () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../ProjectQuoteGenerator', () => ({
  ProjectQuoteGenerator: () => <div>Quote Generator</div>,
}));

vi.mock('../SavedProjectDesigns', () => ({
  SavedProjectDesigns: () => <div>Saved Designs</div>,
}));

vi.mock('../PlannerDefaults', () => ({
  PlannerDefaults: () => <div>Planner Defaults</div>,
}));

vi.mock('../../utils/inventory-client', () => ({
  searchInventoryClient: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('../../utils/supabase/client', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
  getSupabaseUrl: () => 'https://example.supabase.co',
  handleAuthError: vi.fn(),
  clearStaleAuthTokens: vi.fn(),
}));

vi.mock('sonner@2.0.3', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InteriorFinishingPlanner', () => {
  it('renders the planner shell without crashing', () => {
    render(
      <InteriorFinishingPlanner
        user={{
          id: 'user-1',
          role: 'admin',
          email: 'admin@example.com',
          full_name: 'Admin User',
          organizationId: 'org-1',
        } as any}
      />,
    );

    expect(screen.getByText(/floorplan digitizer & takeoff/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /trace floorplan/i })).toBeInTheDocument();
  });
});
