import { Groq } from 'groq-sdk';
import { IAIAgentService } from '../../core/interfaces/ai-agent.interface';
import { ChatMessage } from '../../core/domain/chat.entity';
import { AGENT_DESCRIPTION, AGENT_INSTRUCTION } from './agent.config';

export class GroqAgentAdapter implements IAIAgentService {
  private client: Groq;
  public readonly description: string;
  public readonly instruction: string;
  public readonly model: string;

  constructor(
    apiKey?: string,
    description: string = AGENT_DESCRIPTION,
    instruction: string = AGENT_INSTRUCTION,
    model?: string
  ) {
    const key = apiKey || process.env.GROQ_API_KEY || '';
    this.client = new Groq({ apiKey: key });
    this.description = description;
    this.instruction = instruction;
    this.model = model || process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
  }

  async generateResponse(history: ChatMessage[], prompt: string): Promise<string> {
    const formattedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = history.map((msg) => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.content
    }));

    const messages = [
      { role: 'system' as const, content: this.instruction },
      ...formattedHistory,
      { role: 'user' as const, content: prompt }
    ];

    const maxRetries = 3;
    let delay = 1500;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages,
          temperature: 0.6,
        });

        return completion.choices[0]?.message?.content || 'Sem resposta do modelo.';
      } catch (error: any) {
        const isRateLimitOrUnavailable =
          error?.status === 429 ||
          error?.status === 503 ||
          error?.message?.includes('429') ||
          error?.message?.includes('503') ||
          error?.message?.includes('rate limit');

        if (isRateLimitOrUnavailable && attempt < maxRetries) {
          console.warn(`[GROQ] Limite ou sobrecarga detectada. Tentativa ${attempt} de ${maxRetries}. Aguardando ${delay}ms...`);
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2;
          continue;
        }

        throw error;
      }
    }

    return 'Serviço temporariamente indisponível. Por favor, tente novamente em instantes.';
  }
}
