import { INotificationService, LeadNotificationData } from '../../core/interfaces/notification-service.interface';

export class NtfyNotificationService implements INotificationService {
  private readonly url: string;

  constructor(url?: string) {
    this.url = url || process.env.NTFY_URL || 'https://ntfy.sh/hadtelecom2026';
  }

  async notifyNewLead(lead: LeadNotificationData): Promise<void> {
    try {
      const messageBody = [
        `Novo cadastro na API: ${lead.nome}`,
        `E-mail: ${lead.email}`,
        `WhatsApp: ${lead.whatsapp}`,
        `Comentário: ${lead.comentario}`
      ].join('\n');

      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Title': 'Novo cadastro na API',
        },
        body: messageBody,
      });

      if (!response.ok) {
        console.error(`[NTFY] Falha ao enviar notificação. Status: ${response.status} ${response.statusText}`);
        return;
      }

      console.log(`[NTFY] Notificação enviada para ${this.url}: ${lead.nome}`);
    } catch (error) {
      console.error('[NTFY] Erro ao enviar notificação via NTFY:', error);
    }
  }
}
