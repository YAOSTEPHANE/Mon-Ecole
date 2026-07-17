import api from './client';

export type AssistantReply = {
  reply: string;
  mode: 'llm' | 'local';
  model?: string;
};

export async function chatAssistant(params: {
  prompt: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: string;
}): Promise<AssistantReply> {
  const { data } = await api.post('/assistant/chat', params);
  return data as AssistantReply;
}

export async function assistantStatus(): Promise<{ llmConfigured: boolean; model: string }> {
  const { data } = await api.get('/assistant/status');
  return data as { llmConfigured: boolean; model: string };
}
