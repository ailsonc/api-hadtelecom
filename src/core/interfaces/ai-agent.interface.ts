import { ChatMessage } from '../domain/chat.entity';

export interface IAIAgentService {
  generateResponse(history: ChatMessage[], prompt: string): Promise<string>;
}