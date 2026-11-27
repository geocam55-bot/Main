import {
  Type,
  ThinkingLevel,
  applyAICorsAndMethodGuard,
  parseRequestBody,
  clampText,
  requireGeminiClient,
  generateGeminiJSONWithRetry,
  handleGeminiRouteError,
  resolveCRMAuthContext,
} from '../_lib/aiHelper.js';

export default async function handler(req, res) {
  if (!applyAICorsAndMethodGuard(req, res)) return;

  try {
    const body = parseRequestBody(req);
    const ctx = await resolveCRMAuthContext(req, body);
    if (!ctx) {
      return res.status(401).json({ error: 'Authentication required to use the AI Email Writer.' });
    }
    if (!ctx.organizationId) {
      return res.status(403).json({ error: 'No organization context found for your account.' });
    }

    const allowedModes = new Set(['draft', 'followup', 'rewrite', 'summarize']);
    const allowedTones = new Set(['professional', 'friendly', 'concise', 'persuasive', 'direct']);
    const mode = allowedModes.has(body?.mode) ? String(body.mode) : 'draft';
    const tone = allowedTones.has(body?.tone) ? String(body.tone) : 'professional';
    const promptText = clampText(body?.prompt, 1200);
    const currentSubject = clampText(body?.currentSubject, 250);
    const currentBody = clampText(body?.currentBody, 4000);
    const recipientName = clampText(body?.recipientName, 140);
    const recipientCompany = clampText(body?.recipientCompany, 160);
    const contextSummary = clampText(body?.contextSummary, 1500);
    const contactId = clampText(body?.contactId, 120);

    let groundedContactContext = '';
    if (contactId) {
      try {
        const { data: c } = await ctx.clientSb
          .from('contacts')
          .select('name, company, trade, status, price_level, ytd_sales, lyr_sales')
          .eq('id', contactId)
          .maybeSingle();
        if (c) {
          groundedContactContext = `\nCRM Contact: ${c.name || ''} (${c.company || 'N/A'}), Trade: ${c.trade || 'N/A'}, Status: ${c.status || 'N/A'}, Price Level: ${c.price_level || 'N/A'}, YTD Sales: $${Number(c.ytd_sales || 0).toLocaleString()}, LYR Sales: $${Number(c.lyr_sales || 0).toLocaleString()}.`;
        }
      } catch {}
    }

    const client = await requireGeminiClient([ctx.clientSb, ctx.supabase], ctx.organizationId);
    let instruction = '';
    if (mode === 'summarize') {
      if (!currentBody) {
        return res.status(400).json({ error: 'Email content is required to summarize.' });
      }
      instruction = `Summarize the following customer email concisely for a busy account representative and propose a helpful reply idea.\nSubject: ${currentSubject}\nFrom/To Context: ${recipientName} ${recipientCompany}\nBody:\n${currentBody}`;
    } else if (mode === 'rewrite') {
      if (!currentBody && !currentSubject) {
        return res.status(400).json({ error: 'Please write or paste an email draft first before rewriting.' });
      }
      instruction = `Rewrite the email below in a ${tone} tone while preserving all factual details, quotes, and numbers.\nRecipient: ${recipientName || 'Customer'} ${recipientCompany ? `at ${recipientCompany}` : ''}\nCurrent Subject: ${currentSubject}\nCurrent Body:\n${currentBody}\nAdditional instructions: ${promptText || 'Improve clarity and flow.'}${groundedContactContext}`;
    } else if (mode === 'followup') {
      instruction = `Write a ${tone} customer follow-up email.\nRecipient: ${recipientName || 'Valued Customer'} ${recipientCompany ? `(${recipientCompany})` : ''}\nCurrent Subject: ${currentSubject}\nGoal / Context: ${promptText || 'Follow up on recent quote or check in on upcoming material needs.'}\nExtra Context: ${contextSummary}${groundedContactContext}\nReturn plain text paragraphs (no HTML tags, no markdown asterisks).`;
    } else {
      if (!promptText && !contextSummary && !currentSubject) {
        return res.status(400).json({ error: 'Please describe what you want the email to say.' });
      }
      instruction = `Draft a ${tone} business email for a ProSpaces CRM user (building supplies / construction materials / B2B & contractor CRM).\nRecipient: ${recipientName || 'Customer'} ${recipientCompany ? `(${recipientCompany})` : ''}\nTopic / Instructions: ${promptText || currentSubject}\nExtra Context: ${contextSummary}${groundedContactContext}\nReturn plain text paragraphs (no HTML tags, no markdown asterisks).`;
    }

    const parsed = await generateGeminiJSONWithRetry(
      client,
      instruction,
      {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING },
            summaryPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['subject', 'body', 'summaryPoints'],
        },
      },
      'body'
    );

    return res.status(200).json({ success: true, ...parsed });
  } catch (err) {
    return handleGeminiRouteError(res, err, 'Email Writer request failed.', '/api/ai/email-writer');
  }
}
