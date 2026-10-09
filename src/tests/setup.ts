import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null,
      })),
      data: [],
      error: null,
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
  auth: {
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
      error: null,
    })),
    getSession: vi.fn(async () => ({
      data: { session: null },
      error: null,
    })),
    refreshSession: vi.fn(async () => ({
      data: { session: null },
      error: null,
    })),
    getUser: vi.fn(() => ({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })),
    signOut: vi.fn(async () => ({
      error: null,
    })),
  },
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

vi.mock('../utils/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
  clearStaleAuthTokens: vi.fn(),
  handleAuthError: vi.fn(),
  getSupabaseUrl: vi.fn(() => 'https://example.supabase.co'),
}));

// Mock Supabase client
vi.mock('../utils/supabase', () => ({
  supabase: mockSupabaseClient,
}));

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));