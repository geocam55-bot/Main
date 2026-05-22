import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import type { User } from '../../App';

// Mock user data
export const mockAdminUser: User = {
  id: 'admin-user-id',
  email: 'admin@test.com',
  role: 'Admin',
  organizationId: 'test-org-id',
};

export const mockManagerUser: User = {
  id: 'manager-user-id',
  email: 'manager@test.com',
  role: 'Manager',
  organizationId: 'test-org-id',
};

export const mockSalesUser: User = {
  id: 'sales-user-id',
  email: 'sales@test.com',
  role: 'Sales',
  organizationId: 'test-org-id',
};

// Mock contact data
export const mockContact = {
  id: 'contact-1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-0100',
  company: 'Acme Corp',
  status: 'active' as const,
  priceLevel: 'Retail' as const,
  assignedTo: 'sales-user-id',
  organizationId: 'test-org-id',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Mock bid data
export const mockBid = {
  id: 'bid-1',
  title: 'Test Bid',
  opportunity_id: 'opp-1',
  amount: 1000,
  status: 'draft' as const,
  valid_until: '2024-12-31T00:00:00Z',
  notes: 'Test notes',
  created_at: '2024-01-01T00:00:00Z',
  line_items: [],
  subtotal: 900,
  discount_percent: 10,
  discount_amount: 90,
  tax_percent: 10,
  tax_amount: 81,
  organization_id: 'test-org-id',
};

// Mock quote data
export const mockQuote = {
  id: 'quote-1',
  title: 'Test Quote',
  contact_id: 'contact-1',
  total: 1000,
  status: 'draft' as const,
  validUntil: '2024-12-31T00:00:00Z',
  notes: 'Test notes',
  createdAt: '2024-01-01T00:00:00Z',
  lineItems: [],
  subtotal: 900,
  discountPercent: 10,
  discountAmount: 90,
  taxPercent: 10,
  taxAmount: 81,
  organizationId: 'test-org-id',
};

// Mock opportunity data
export const mockOpportunity = {
  id: 'opp-1',
  title: 'Test Opportunity',
  contactId: 'contact-1',
  value: 5000,
  stage: 'qualification' as const,
  expectedCloseDate: '2024-12-31',
  assignedTo: 'sales-user-id',
  organizationId: 'test-org-id',
  createdAt: '2024-01-01T00:00:00Z',
};

// Custom render function with common providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: User;
}

export function renderWithUser(
  ui: React.ReactElement,
  { user = mockAdminUser, ...options }: CustomRenderOptions = {}
) {
  return render(ui, options);
}

export * from '@testing-library/react';
