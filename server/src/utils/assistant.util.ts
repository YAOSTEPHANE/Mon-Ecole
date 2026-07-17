/**
 * Assistant IA métier — OpenAI-compatible (OPENAI_API_KEY).
 * Sans clé : réponses pédagogiques locales (règles).
 */

export type AssistantMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AssistantChatResult = {
  reply: string;
  mode: 'llm' | 'local';
  model?: string;
};

const SYSTEM_PROMPT = `Tu es l'assistant pédagogique d'une plateforme de gestion scolaire (Côte d'Ivoire / francophone).
Réponds en français, de façon claire et concise.
Tu aides : résumés de bulletins, conseils d'orientation, messages aux parents, détection de signaux de décrochage, formulation de conseils de classe.
Ne invente pas de notes chiffrées absentes du contexte. Si le contexte est insuffisant, pose une question courte.`;

function localPedagogicalReply(userText: string, context?: string): string {
  const text = `${userText}\n${context || ''}`.toLowerCase();
  const tips: string[] = [];

  if (/bulletin|moyenne|note|trimestre/.test(text)) {
    tips.push(
      'Pour un commentaire de bulletin : commencez par un point positif, citez 1–2 compétences observables, puis une piste d’amélioration concrète et encourageante.',
    );
  }
  if (/absence|retard|décrochage|risque/.test(text)) {
    tips.push(
      'Signaux de décrochage : absences répétées, notes en baisse sur 2 périodes, devoirs non rendus. Proposez un entretien parent + plan de rattrapage sur 2 semaines.',
    );
  }
  if (/parent|message|sms|mail/.test(text)) {
    tips.push(
      'Message aux parents : factuel, respectueux, une action claire (ex. « merci de prendre RDV mercredi »). Évitez le jargon administratif.',
    );
  }
  if (/orientation|conseil de classe|passage/.test(text)) {
    tips.push(
      'Orientation : croisez résultats, motivation et projet. Documentez la décision et proposez un suivi (stage, tutorat, filière).',
    );
  }
  if (tips.length === 0) {
    tips.push(
      'Décrivez la situation (classe, période, élève anonymisé) pour une aide plus précise. Ex. : « Rédige un avis de conseil pour un élève en baisse en maths mais assidu. »',
    );
  }
  tips.push(
    'Astuce : configurez OPENAI_API_KEY (et optionnellement OPENAI_BASE_URL / OPENAI_MODEL) pour activer l’IA générative complète.',
  );
  return tips.join('\n\n');
}

export async function runAssistantChat(params: {
  prompt: string;
  context?: string;
  history?: AssistantMessage[];
}): Promise<AssistantChatResult> {
  const prompt = params.prompt?.trim() || '';
  if (!prompt) {
    return { reply: 'Veuillez saisir une question.', mode: 'local' };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      reply: localPedagogicalReply(prompt, params.context),
      mode: 'local',
    };
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

  const messages: AssistantMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(params.history || []).slice(-8),
  ];
  if (params.context?.trim()) {
    messages.push({
      role: 'user',
      content: `Contexte établissement / dossier :\n${params.context.trim()}`,
    });
  }
  messages.push({ role: 'user', content: prompt });

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 900,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[assistant] LLM error', res.status, errText.slice(0, 400));
    return {
      reply: `${localPedagogicalReply(prompt, params.context)}\n\n(Le service LLM est temporairement indisponible — réponse locale.)`,
      mode: 'local',
    };
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    return { reply: localPedagogicalReply(prompt, params.context), mode: 'local' };
  }
  return { reply, mode: 'llm', model };
}

export function isAssistantLlmConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
