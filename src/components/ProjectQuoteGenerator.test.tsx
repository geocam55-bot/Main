import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectQuoteGenerator } from './ProjectQuoteGenerator';

const getAllMock = vi.fn();
const getOrganizationSettingsMock = vi.fn();
const createQuoteMock = vi.fn();

vi.mock('../utils/api', () => ({
  contactsAPI: {
    getAll: (...args: any[]) => getAllMock(...args),
  },
  quotesAPI: {
    create: (...args: any[]) => createQuoteMock(...args),
  },
  settingsAPI: {
    getOrganizationSettings: (...args: any[]) => getOrganizationSettingsMock(...args),
  },
}));

describe('ProjectQuoteGenerator', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    getAllMock.mockReset();
    getOrganizationSettingsMock.mockReset();
    createQuoteMock.mockReset();
    createQuoteMock.mockResolvedValue({ id: 'quote-1' });
    getOrganizationSettingsMock.mockResolvedValue({ tax_rate: 0, tax_rate_2: 0 });
  });

  it('lets planner users find CRM contacts when creating a quote', async () => {
    getAllMock.mockResolvedValue({
      contacts: [
        {
          id: 'contact-1',
          name: 'George Campbell',
          email: 'george@example.com',
          company: 'Campbell Projects',
          priceLevel: 'VIP A',
        },
      ],
    });

    render(
      <ProjectQuoteGenerator
        user={{
          id: 'user-1',
          full_name: 'Designer One',
          email: 'designer@example.com',
          role: 'designer',
          organizationId: 'org-123',
        }}
        projectType="deck"
        materials={[]}
        totalCost={1000}
        projectData={{}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /create quote for contact/i }));

    const input = await screen.findByPlaceholderText('Search customers by name, email, or company...');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('George Campbell')).toBeInTheDocument();
    });
  });

  it('supports creating a quote from a manual amount without inventory line items', async () => {
    getAllMock.mockResolvedValue({
      contacts: [
        {
          id: 'contact-1',
          name: 'George Campbell',
          email: 'george@example.com',
          company: 'Campbell Projects',
          priceLevel: 'VIP A',
        },
      ],
    });

    render(
      <ProjectQuoteGenerator
        user={{
          id: 'user-1',
          full_name: 'Designer One',
          email: 'designer@example.com',
          role: 'designer',
          organizationId: 'org-123',
        }}
        projectType="deck"
        materials={[]}
        totalCost={0}
        projectData={{}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /create quote for contact/i }));

    const searchInput = await screen.findByPlaceholderText('Search customers by name, email, or company...');
    fireEvent.focus(searchInput);

    const contactOption = await screen.findByText('George Campbell');
    fireEvent.click(contactOption);

    fireEvent.change(screen.getByLabelText('Quote Title *'), { target: { value: 'Manual Amount Quote' } });

    expect(screen.getByLabelText('Enter subtotal manually (without inventory line items)')).toBeChecked();
    fireEvent.change(screen.getByLabelText('Subtotal Amount *'), { target: { value: '4000.00' } });

    fireEvent.click(screen.getByRole('button', { name: /create quote/i }));

    await waitFor(() => {
      expect(createQuoteMock).toHaveBeenCalled();
    });

    const payload = createQuoteMock.mock.calls[0][0];
    expect(payload.subtotal).toBe(4000);
    expect(payload.total).toBe(4000);
    expect(payload.line_items).toEqual([]);
  });
});
