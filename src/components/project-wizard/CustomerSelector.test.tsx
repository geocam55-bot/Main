import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerSelector } from './CustomerSelector';

const getAllMock = vi.fn();

vi.mock('../../utils/api', () => ({
  contactsAPI: {
    getAll: (...args: any[]) => getAllMock(...args),
  },
}));

vi.mock('../../utils/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    }),
  }),
}));

describe('CustomerSelector', () => {
  beforeEach(() => {
    getAllMock.mockReset();
  });

  it('shows the same personal contacts used by the CRM even when userId is provided', async () => {
    getAllMock.mockResolvedValue({
      contacts: [
        {
          id: 'c1',
          name: 'Acme Builder',
          email: 'acme@example.com',
          company: 'Acme Co',
          phone: '555-1212',
          priceLevel: 'VIP A',
        },
      ],
    });

    const onCustomerSelect = vi.fn();

    render(
      <CustomerSelector
        organizationId="org-123"
        selectedCustomer={null}
        onCustomerSelect={onCustomerSelect}
        userId="user-123"
      />,
    );

    const input = screen.getByPlaceholderText('Search customers by name, email, or company...');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Acme Builder')).toBeInTheDocument();
    });

    expect(screen.getByText('VIP A')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Acme Builder'));

    expect(onCustomerSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1', name: 'Acme Builder', price_level: 'VIP A' }),
    );
  });
});
