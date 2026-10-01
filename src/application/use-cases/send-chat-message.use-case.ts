import { IAIAgentService } from '../../core/interfaces/ai-agent.interface';
import { ChatMessage, ChatResponse } from '../../core/domain/chat.entity';
import { SqliteLeadRepository } from '../../infrastructure/database/sqlite-lead.repository';

export class SendChatMessageUseCase {
  private leadRepo: SqliteLeadRepository;

  constructor(private readonly aiService: IAIAgentService) {
    this.leadRepo = new SqliteLeadRepository();
  }

  async execute(history: ChatMessage[], prompt: string): Promise<ChatResponse> {
    if (!prompt || prompt.trim() === '') {
      throw new Error('A mensagem do usuário não pode estar vazia.');
    }

    const rawReply = await this.aiService.generateResponse(history, prompt);

    const match = rawReply.match(/<<<LEAD_DATA\s*([\s\S]*?)\s*LEAD_DATA>>>/);
    let cleanReply = rawReply;

    if (match && match[1]) {
      cleanReply = rawReply.replace(/<<<LEAD_DATA[\s\S]*?LEAD_DATA>>>/, '').trim();
      const jsonContent = match[1].trim();

      try {
        const leadData = JSON.parse(jsonContent);

        // Salva instantaneamente no SQLite sem latência de rede
        this.leadRepo.save({
          nome: leadData.nome,
          email: leadData.email,
          whatsapp: leadData.whatsapp,
          comentario: leadData.comentario
        });

        console.log('[LEAD] Salvo com sucesso no SQLite!');
      } catch (err) {
        console.error('[LEAD] Erro ao persistir no SQLite:', err);
      }
    }

    return {
      reply: cleanReply,
      timestamp: new Date()
    };
  }
}