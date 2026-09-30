import { IAIAgentService } from '../../core/interfaces/ai-agent.interface';
import { ChatMessage, ChatResponse } from '../../core/domain/chat.entity';
import { EmailService, IEmailService, LeadData } from '../../infrastructure/mail/nodemailer.service';

export class SendChatMessageUseCase {
  private readonly emailService: IEmailService;

  constructor(
    private readonly aiService: IAIAgentService,
    emailService?: IEmailService
  ) {
    this.emailService = emailService ?? new EmailService();
  }

  async execute(history: ChatMessage[], prompt: string): Promise<ChatResponse> {
    if (!prompt || prompt.trim() === '') {
      throw new Error('A mensagem do usuário não pode estar vazia.');
    }

    const rawReply = await this.aiService.generateResponse(history, prompt);

    console.log('[DEBUG LLM REPLY]:', rawReply);

    const match = rawReply.match(/<<<LEAD_DATA\s*([\s\S]*?)\s*LEAD_DATA>>>/);
    let cleanReply = rawReply;

    if (match && match[1]) {
      console.log('[LEAD] Bloco de lead detectado!');
      cleanReply = rawReply.replace(/<<<LEAD_DATA[\s\S]*?LEAD_DATA>>>/, '').trim();

      const jsonContent = match[1].trim();

      try {
        const leadData: LeadData = JSON.parse(jsonContent);
        console.log('[LEAD] Enviando via SMTP Titan HostGator...', leadData);
        
        // Envia o e-mail de forma assíncrona
        await this.emailService.sendLeadNotification(leadData);
        console.log('[LEAD] E-mail enviado com sucesso via HostGator!');
      } catch (err) {
        console.error('[LEAD] Erro ao enviar notificação de lead:', err);
      }
    } else {
      console.log('[LEAD] Nenhum bloco de lead foi encontrado nesta resposta.');
    }

    return {
      reply: cleanReply,
      timestamp: new Date()
    };
  }
}