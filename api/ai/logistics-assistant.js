import {
  Type,
  ThinkingLevel,
  applyAICorsAndMethodGuard,
  parseRequestBody,
  clampText,
  requireGeminiClient,
  generateGeminiJSONWithRetry,
  handleGeminiRouteError,
  resolveLogisticsAuthContext,
} from '../_lib/aiHelper.js';

export default async function handler(req, res) {
  if (!applyAICorsAndMethodGuard(req, res)) return;

  try {
    const body = parseRequestBody(req);
    const ctx = await resolveLogisticsAuthContext(req, body);
    if (!ctx) {
      return res.status(401).json({ error: 'Authentication required to access the Logistics AI Copilot.' });
    }

    const allowedModes = new Set(['dispatch-qa', 'route-optimize', 'customer-eta', 'polish-pod']);
    const mode = allowedModes.has(body?.mode) ? String(body.mode) : 'dispatch-qa';
    const question = clampText(body?.question, 800);
    const rawNotes = clampText(body?.rawNotes, 2000);
    const deliveryId = clampText(body?.deliveryId, 120);

    const clientDeliveries = Array.isArray(body?.deliveries) ? body.deliveries : [];
    const clientTrucks = Array.isArray(body?.trucks) ? body.trucks : [];

    const compactDeliveries = clientDeliveries.slice(0, 120).map((d) => ({
      id: clampText(d.id, 60),
      customerName: clampText(d.customerName, 100),
      deliveryAddress: clampText(d.deliveryAddress, 140),
      originBranch: clampText(d.originBranch, 60),
      status: clampText(d.status, 40),
      assignedTruck: clampText(d.assignedTruck, 60),
      assignedDriver: clampText(d.assignedDriver, 80),
      scheduledDate: clampText(d.scheduledDate, 30),
      scheduledSlot: clampText(d.scheduledSlot, 10),
      weight: clampText(d.weight, 30),
      documentType: clampText(d.documentType, 30),
      deliveryCategory: clampText(d.deliveryCategory, 40),
      returnReason: clampText(d.returnReason, 120),
      destinationNotes: clampText(d.destinationNotes, 150),
    }));

    const compactTrucks = clientTrucks.slice(0, 40).map((t) => ({
      id: clampText(t.id, 60),
      name: clampText(t.name, 80),
      driver: clampText(t.driver, 80),
      homeBranch: clampText(t.homeBranch, 60),
      capacity: clampText(t.capacity, 40),
      status: clampText(t.status, 30),
    }));

    const client = await requireGeminiClient([ctx.clientSb, ctx.supabase], ctx.organizationId);

    if (mode === 'polish-pod') {
      if (!rawNotes) {
        return res.status(400).json({ error: 'Please enter driver field notes to polish.' });
      }
      const prompt = `You are the ProSpaces Logistics Proof-of-Delivery Assistant. Rewrite the raw driver field note below into a clear, factual, professional delivery note for customer records and dispatchers. Do NOT invent facts.\n\nRaw Driver Notes: "${rawNotes}"`;
      const parsed = await generateGeminiJSONWithRetry(
        client,
        prompt,
        {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              polishedNote: { type: Type.STRING },
              recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['summary', 'polishedNote', 'recommendedActions'],
          },
        },
        'polishedNote'
      );
      return res.status(200).json({ success: true, mode, ...parsed });
    }

    if (mode === 'customer-eta') {
      const target = compactDeliveries.find((d) => d.id === deliveryId) || body?.delivery;
      if (!target) {
        return res.status(400).json({ error: 'Delivery details are required to draft a customer ETA message.' });
      }
      const prompt = `You are the ProSpaces Logistics Customer Update Writer. Draft a clear, polite customer ETA / delivery status update email/SMS based strictly on this delivery record and optional dispatcher note.\n\nDispatcher Note: "${question || 'Provide proactive status and ETA update.'}"\nDelivery Record JSON:\n${JSON.stringify(target)}`;
      const parsed = await generateGeminiJSONWithRetry(
        client,
        prompt,
        {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              emailSubject: { type: Type.STRING },
              emailBody: { type: Type.STRING },
              smsText: { type: Type.STRING },
            },
            required: ['summary', 'emailSubject', 'emailBody', 'smsText'],
          },
        },
        'summary'
      );
      return res.status(200).json({ success: true, mode, ...parsed });
    }

    if (mode === 'route-optimize') {
      const prompt = `You are the ProSpaces Logistics Dispatch & Route Optimizer.
Analyze the live deliveries and fleet trucks below. Identify:
1. Unassigned or unscheduled deliveries that need truck/slot allocation.
2. Any trucks carrying multiple heavy loads or cross-branch mismatches.
3. Concrete assignment & batching recommendations (truck + AM/PM slot) grouped by depot/branch.
Use ONLY the IDs, names, branches, and trucks present in the JSON below.

Fleet Trucks JSON: ${JSON.stringify(compactTrucks)}
Deliveries Queue JSON: ${JSON.stringify(compactDeliveries)}`;

      const parsed = await generateGeminiJSONWithRetry(
        client,
        prompt,
        {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    deliveryId: { type: Type.STRING },
                    customerName: { type: Type.STRING },
                    recommendedTruck: { type: Type.STRING },
                    recommendedSlot: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                  },
                  required: ['deliveryId', 'customerName', 'recommendedTruck', 'recommendedSlot', 'rationale'],
                },
              },
            },
            required: ['summary', 'warnings', 'recommendations'],
          },
        },
        'summary'
      );
      return res.status(200).json({ success: true, mode, ...parsed });
    }

    if (!question) {
      return res.status(400).json({ error: 'Please enter a dispatch question.' });
    }
    const prompt = `You are the ProSpaces Logistics Dispatch Copilot.
Answer the dispatcher's question accurately using ONLY the live deliveries and trucks data below. Reference exact Delivery IDs, Customer Names, Truck Names, and Branch IDs when helpful.

Dispatcher Question: "${question}"
Fleet Trucks JSON: ${JSON.stringify(compactTrucks)}
Deliveries Queue JSON: ${JSON.stringify(compactDeliveries)}`;

    const parsed = await generateGeminiJSONWithRetry(
      client,
      prompt,
      {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            highlightedDeliveryIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['answer', 'highlightedDeliveryIds', 'recommendedActions'],
        },
      },
      'answer'
    );
    return res.status(200).json({ success: true, mode, ...parsed });
  } catch (err) {
    return handleGeminiRouteError(res, err, 'Logistics AI Copilot request failed.', '/api/ai/logistics-assistant');
  }
}
