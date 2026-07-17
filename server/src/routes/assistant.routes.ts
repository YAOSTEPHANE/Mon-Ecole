import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.middleware';
import { isAssistantLlmConfigured, runAssistantChat } from '../utils/assistant.util';
import { apiGlobalLimiter } from '../middleware/rate-limit.middleware';

const router = express.Router();

router.use(authenticate);
router.use(
  authorize('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'EDUCATOR', 'STAFF'),
);

router.get('/status', (_req, res) => {
  res.json({
    llmConfigured: isAssistantLlmConfigured(),
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
  });
});

router.post(
  '/chat',
  apiGlobalLimiter,
  body('prompt').isString().trim().isLength({ min: 1, max: 4000 }),
  body('context').optional().isString().isLength({ max: 8000 }),
  body('history').optional().isArray({ max: 12 }),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { prompt, context, history } = req.body as {
        prompt: string;
        context?: string;
        history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      };
      const safeHistory = Array.isArray(history)
        ? history
            .filter(
              (h) =>
                h &&
                (h.role === 'user' || h.role === 'assistant') &&
                typeof h.content === 'string',
            )
            .map((h) => ({ role: h.role, content: h.content.slice(0, 2000) }))
        : [];

      const result = await runAssistantChat({
        prompt,
        context,
        history: safeHistory,
      });
      res.json(result);
    } catch (e) {
      console.error('POST /assistant/chat:', e);
      res.status(500).json({ error: 'Assistant indisponible' });
    }
  },
);

export default router;
