import { IAIAgentService } from '../../core/interfaces/ai-agent.interface';
import { ChatMessage, ChatResponse } from '../../core/domain/chat.entity';
import { ILeadRepository, TursoLeadRepository } from '../../infrastructure/database/turso-lead.repository';

export class SendChatMessageUseCase {
  private readonly leadRepo: ILeadRepository | undefined;

  constructor(
    private readonly aiService: IAIAgentService,
    leadRepo?: ILeadRepository
  ) {
    this.leadRepo = leadRepo;
  }

  async execute(history: ChatMessage[], prompt: string): Promise<ChatResponse> {
    if (!prompt || prompt.trim() === '') {
      throw new Error('A mensagem do usuário não pode estar vazia.');
    }

    const rawReply = await this.aiService.generateResponse(history, prompt);

    const match = rawReply.match(/<<<LEAD_DATA\s*([\s\S]*?)\s*LEAD_DATA>>>/);
    let cleanReply = rawReply;

    let leadSaved = false;

    if (match && match[1]) {
      cleanReply = rawReply.replace(/<<<LEAD_DATA[\s\S]*?LEAD_DATA>>>/, '').trim();
      const jsonContent = match[1].trim();

      try {
        const leadData = JSON.parse(jsonContent);

        const leadRepo = this.leadRepo ?? new TursoLeadRepository();
        await leadRepo.save({
          nome: leadData.nome,
          email: leadData.email,
          whatsapp: leadData.whatsapp,
          comentario: leadData.comentario,
          status: 'enviado'
        });

        leadSaved = true;
        console.log('[LEAD] Salvo com sucesso no Turso!');
      } catch (err) {
        console.error('[LEAD] Erro ao persistir no Turso:', err);
      }
    }

    const response: ChatResponse = {
      reply: cleanReply,
      timestamp: new Date()
    };

    if (leadSaved) {
      response.status = 'enviado';
    }

    return response;
  }
}