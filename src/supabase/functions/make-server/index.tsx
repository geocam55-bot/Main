import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { azureOAuthInit } from './azure-oauth-init.ts';
import { azureOAuthCallback } from './azure-oauth-callback.ts';
import { googleRoutes } from './google-oauth.ts';
import { microsoftRoutes } from './microsoft-oauth.ts';
import { emailRoutes } from './email-handler.ts';
import { calendarRoutes } from './calendar-handler.ts';
import { dataMigration } from './data-migration.ts';
import { fixProfileMismatch } from './fix-profile-mismatch.ts';
import { handleResetPassword } from './reset-password.ts';
import { backgroundJobs } from './background-jobs.ts';

const app = new Hono();

app.use('*', logger(console.log));
app.use('*', cors());

// Mount OAuth routes
app.route('/', googleRoutes);
app.route('/', microsoftRoutes);
app.route('/', emailRoutes);
app.route('/', calendarRoutes);

// Legacy Azure routes (keeping for backwards compatibility)
azureOAuthInit(app);
azureOAuthCallback(app);

// Other routes
dataMigration(app);
fixProfileMismatch(app);
backgroundJobs(app);

// Health check endpoint
app.get('/', (c) => {
  return c.json({ status: 'ok', app: 'ProSpaces CRM', server: 'make-server', timestamp: new Date().toISOString() });
});
app.get('/health', (c) => {
  console.log('Health check endpoint hit');
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Password reset endpoint
app.post('/reset-password', handleResetPassword);

// Catch Deno HTTP connection closed errors gracefully to prevent unhandled rejection crashes
globalThis.addEventListener("unhandledrejection", (e) => {
  if (e.reason?.name === "Http" || e.reason?.message?.includes("connection closed")) {
    e.preventDefault();
  }
});

Deno.serve(async (req, info) => {
  try {
    return await app.fetch(req, info);
  } catch (error: any) {
    if (error?.name === 'Http' || error?.message?.includes('connection closed before message completed')) {
      console.warn('Client disconnected before response could be sent:', error.message);
      return new Response(null, { status: 499 });
    }
    console.error('Unhandled server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});