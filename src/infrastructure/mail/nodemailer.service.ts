import nodemailer from 'nodemailer';

export interface LeadData {
  nome: string;
  email: string;
  whatsapp: string;
  comentario: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.titan.email',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE !== 'false', // true para porta 465 (SSL)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendLeadNotification(lead: LeadData): Promise<void> {
    const toEmail = process.env.MAIL_TO || process.env.SMTP_USER;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0056b3;">Novo Lead Recebido - Chatbot HAD Telecom</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left; width: 150px;">Nome</th>
            <td style="padding: 10px; border: 1px solid #ddd;">${lead.nome}</td>
          </tr>
          <tr>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">E-mail</th>
            <td style="padding: 10px; border: 1px solid #ddd;">${lead.email}</td>
          </tr>
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">WhatsApp</th>
            <td style="padding: 10px; border: 1px solid #ddd;">${lead.whatsapp}</td>
          </tr>
          <tr>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Comentários</th>
            <td style="padding: 10px; border: 1px solid #ddd;">${lead.comentario}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #777;">Enviado automaticamente pelo agente virtual HAD Telecom.</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: `"HAD Telecom - Agente Virtual" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Novo Lead - ${lead.nome}`,
      replyTo: lead.email,
      html: htmlContent,
    });
  }
}