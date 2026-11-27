import {
  applySecureEnvCorsAndMethodGuard,
  clearAppSessionCookie,
} from '../_lib/secureEnvHelper.js';

export default async function handler(req, res) {
  if (!applySecureEnvCorsAndMethodGuard(req, res, ['POST', 'OPTIONS'])) return;

  clearAppSessionCookie(res, req);
  return res.status(200).json({ success: true });
}
