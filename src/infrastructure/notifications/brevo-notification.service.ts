import { INotificationService, LeadNotificationData } from '../../core/interfaces/notification-service.interface';

export class BrevoNotificationService implements INotificationService {
  private readonly apiKey: string;
  private readonly senderEmail: string;
  private readonly notifyEmailTo: string;

  constructor(apiKey?: string, senderEmail?: string, notifyEmailTo?: string) {
    this.apiKey = apiKey ?? process.env.BREVO_API_KEY ?? '';
    this.senderEmail = senderEmail ?? process.env.BREVO_SENDER_EMAIL ?? '';
    this.notifyEmailTo = notifyEmailTo ?? process.env.BREVO_NOTIFY_EMAIL_TO ?? 'ailsonlcosta@gmail.com';
  }

  async notifyNewLead(lead: LeadNotificationData): Promise<void> {
    if (!this.apiKey || !this.senderEmail || !this.notifyEmailTo) {
      console.warn(
        '[BREVO] Notificação não enviada: configure BREVO_API_KEY, BREVO_SENDER_EMAIL e NOTIFY_EMAIL_TO no arquivo .env.'
      );
      return;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          sender: { name: 'Notificações', email: this.senderEmail },
          to: [{ email: this.notifyEmailTo }],
          subject: `Novo cadastro: ${lead.nome}`,
          textContent: [
            `Nome: ${lead.nome}`,
            `E-mail: ${lead.email}`,
            `WhatsApp: ${lead.whatsapp}`,
            `Comentário: ${lead.comentario}`,
          ].join('\n'),
        }),
      });

      if (!response.ok) {
        console.error(`[BREVO] Falha: ${response.status} ${await response.text()}`);
        return;
      }

      console.log(`[BREVO] E-mail de notificação de novo lead enviado com sucesso para: ${this.notifyEmailTo}`);
    } catch (error) {
      console.error('[BREVO] Erro:', error);
    }
  }
}
