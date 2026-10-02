import { GoogleGenAI } from '@google/genai';
import { IAIAgentService } from '../../core/interfaces/ai-agent.interface';
import { ChatMessage } from '../../core/domain/chat.entity';
import { AGENT_DESCRIPTION, AGENT_INSTRUCTION } from './agent.config';

export class GoogleAgentAdapter implements IAIAgentService {
  private client: GoogleGenAI;
  public readonly description: string;
  public readonly instruction: string;
  public readonly model: string;
  public readonly maxTokens: number;

  constructor(
    apiKey?: string,
    description: string = AGENT_DESCRIPTION,
    instruction: string = AGENT_INSTRUCTION,
    model?: string,
    client?: GoogleGenAI,
    maxTokens?: number
  ) {
    const key = apiKey || process.env.GEMINI_API_KEY || '';
    this.client = client ?? new GoogleGenAI({ apiKey: key });
    this.description = description;
    this.instruction = instruction;
    this.model = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.maxTokens =
      maxTokens ??
      (process.env.GEMINI_MAX_TOKENS
        ? Number(process.env.GEMINI_MAX_TOKENS)
        : process.env.GOOGLE_MAX_TOKENS
        ? Number(process.env.GOOGLE_MAX_TOKENS)
        : 700);
  }

  async generateResponse(history: ChatMessage[], prompt: string): Promise<string> {
    const formattedHistory = history.map((msg) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = this.client.chats.create({
      model: this.model,
      config: {
        systemInstruction: this.instruction,
        temperature: 0.6,
        maxOutputTokens: this.maxTokens,
      },
      history: formattedHistory,
    });

    const response = await chat.sendMessage({
      message: prompt,
    });

    return response.text || 'Sem resposta do modelo.';
  }
}
