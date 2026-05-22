/**
 * Scoped system email settings used for free account setup + billing flows only.
 */
export const FREE_ACCOUNT_BILLING_SUPPORT_EMAIL = 'support@prospacescrm.ca';

export const FREE_ACCOUNT_BILLING_SMTP = {
  incoming: {
    protocol: 'imap',
    host: 'imap.ionos.com',
    port: 993,
    ssl: true,
  },
  outgoing: {
    protocol: 'smtp',
    host: 'smtp.ionos.com',
    port: 587,
    tls: true,
    authRequired: true,
  },
} as const;
