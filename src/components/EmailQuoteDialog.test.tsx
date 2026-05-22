import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAccountsMock = vi.fn();
const sendEmailMock = vi.fn();
const getSessionMock = vi.fn();
const refreshSessionMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('../utils/api', () => ({
  emailAPI: {
    getAccounts: (...args: any[]) => getAccountsMock(...args),
    sendEmail: (...args: any[]) => sendEmailMock(...args),
  },
}));

vi.mock('../utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: (...args: any[]) => getSessionMock(...args),
      refreshSession: (...args: any[]) => refreshSessionMock(...args),
    },
  }),
}));

vi.mock('../utils/server-function-url', () => ({
  buildServerFunctionUrl: () => '/email-send',
}));

vi.mock('../utils/server-headers', () => ({
  getServerHeaders: vi.fn().mockImplementation(async (extraHeaders: Record<string, string> = {}) => ({
    'Content-Type': 'application/json',
    'X-User-Token': 'test-token',
    ...extraHeaders,
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  },
}));

describe('EmailQuoteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccountsMock.mockResolvedValue({
      accounts: [{ id: 'acc-1', email: 'sales@example.com', provider: 'gmail' }],
    });
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'initial-token' } },
      error: null,
    });
    refreshSessionMock.mockResolvedValue({
      data: { session: { access_token: 'fresh-token' } },
      error: null,
    });
    sendEmailMock.mockRejectedValue(new Error('invalid token'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      }),
    );
  });

  it('keeps the deal email flow successful when server send succeeds', async () => {
    const { EmailQuoteDialog } = await import('./EmailQuoteDialog');
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <EmailQuoteDialog
        open={true}
        onOpenChange={onOpenChange}
        quote={{
          id: 'quote-1',
          quoteNumber: 'Q-1001',
          contactName: 'George Campbell',
          contactEmail: 'george@example.com',
          total: 2500,
          lineItems: [{ id: '1' }],
          organization_id: 'org-1',
        }}
        orgSettings={{ organization_name: 'ProSpaces' }}
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(getAccountsMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /send quote/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toastSuccess).toHaveBeenCalledWith('Email sent successfully');
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('retries once after refreshing the session when the server rejects the user token', async () => {
    const { EmailQuoteDialog } = await import('./EmailQuoteDialog');
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    refreshSessionMock.mockResolvedValue({
      data: { session: { access_token: 'fresh-token' } },
      error: null,
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid user token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

    vi.stubGlobal('fetch', fetchMock);

    render(
      <EmailQuoteDialog
        open={true}
        onOpenChange={onOpenChange}
        quote={{
          id: 'quote-2',
          quoteNumber: 'Q-1002',
          contactName: 'George Campbell',
          contactEmail: 'george@example.com',
          total: 3200,
          lineItems: [{ id: '1' }],
          organization_id: 'org-1',
        }}
        orgSettings={{ organization_name: 'ProSpaces' }}
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(getAccountsMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /send quote/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    expect(refreshSessionMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1]?.[1] as any)?.headers?.['X-User-Token']).toBe('fresh-token');
  });
});
