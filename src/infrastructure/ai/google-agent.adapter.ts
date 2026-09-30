import { GoogleGenAI } from '@google/genai';
import { IAIAgentService } from '../../core/interfaces/ai-agent.interface';
import { ChatMessage } from '../../core/domain/chat.entity';
import { AGENT_DESCRIPTION, AGENT_INSTRUCTION } from './agent.config';

export class GoogleAgentAdapter implements IAIAgentService {
  private client: GoogleGenAI;
  public readonly description: string;
  public readonly instruction: string;

  constructor(
    apiKey: string,
    description: string = AGENT_DESCRIPTION,
    instruction: string = AGENT_INSTRUCTION
  ) {
    this.client = new GoogleGenAI({ apiKey });
    this.description = description;
    this.instruction = instruction;
  }

  async generateResponse(history: ChatMessage[], prompt: string): Promise<string> {
    const formattedHistory = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const maxRetries = 3;
    let delay = 1500; // Começa com 1.5s de espera

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const chat = this.client.chats.create({
          model: 'gemini-3.6-flash',
          config: {
            systemInstruction: this.instruction
          },
          history: formattedHistory
        });

        const response = await chat.sendMessage({
          message: prompt
        });

        return response.text || 'Sem resposta do modelo.';
      } catch (error: any) {
        const isUnavailable = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('high demand');

        if (isUnavailable && attempt < maxRetries) {
          console.warn(`[GEMINI 503] Sobrecarga detectada. Tentativa ${attempt} de ${maxRetries}. Aguardando ${delay}ms...`);
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2; // Dobra o tempo (1.5s -> 3s)
          continue;
        }

        throw error;
      }
    }

    return 'Serviço temporariamente indisponível. Por favor, tente novamente em instantes.';
  }
}