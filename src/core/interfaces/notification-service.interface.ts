export interface LeadNotificationData {
  nome: string;
  email: string;
  whatsapp: string;
  comentario: string;
}

export interface INotificationService {
  notifyNewLead(lead: LeadNotificationData): Promise<void>;
}
