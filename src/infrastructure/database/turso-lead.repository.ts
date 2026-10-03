import { createClient, type Client } from '@libsql/client';
import { INotificationService } from '../../core/interfaces/notification-service.interface';
import { BrevoNotificationService } from '../notifications/brevo-notification.service';
import { EncryptionService } from '../security/encryption.service';

export interface LeadRecord {
    id?: number;
    nome: string;
    email: string;
    whatsapp: string;
    comentario: string;
    status?: string;
    created_at?: string;
}

export interface ILeadRepository {
    save(lead: Omit<LeadRecord, 'id' | 'created_at'>): Promise<void>;
    findAll(): Promise<LeadRecord[]>;
}

export class TursoLeadRepository implements ILeadRepository {
    private readonly db: Client;
    private readonly notificationService?: INotificationService;
    private readonly encryptionService: EncryptionService;
    private initialization?: Promise<void>;

    constructor(
        notificationServiceOrClient?: INotificationService | Client,
        client?: Client,
        encryptionService?: EncryptionService
    ) {
        let notificationService: INotificationService | undefined;
        let dbClient: Client | undefined;

        if (notificationServiceOrClient && 'execute' in notificationServiceOrClient) {
            dbClient = notificationServiceOrClient as Client;
        } else {
            notificationService = notificationServiceOrClient as INotificationService | undefined;
            dbClient = client;
        }

        if (dbClient) {
            this.db = dbClient;
        } else {
            const url = process.env.DATABASE_URL;
            const authToken = process.env.DATABASE_TOKEN;
            if (!url || !authToken) {
                throw new Error('DATABASE_URL e DATABASE_TOKEN são obrigatórios para conectar ao Turso.');
            }
            this.db = createClient({ url, authToken });
        }

        this.notificationService = notificationService ?? new BrevoNotificationService();
        this.encryptionService = encryptionService ?? new EncryptionService();
    }

    private async init(): Promise<void> {
        const query = `
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL,
        whatsapp TEXT NOT NULL,
        comentario TEXT NOT NULL,
        status TEXT DEFAULT 'enviado',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
        await this.db.execute(query);

        const columns = await this.db.execute('PRAGMA table_info(leads)');
        const hasStatus = columns.rows.some((column) => column.name === 'status');
        if (!hasStatus) {
            await this.db.execute("ALTER TABLE leads ADD COLUMN status TEXT DEFAULT 'enviado'");
        }
    }

    private ensureInitialized(): Promise<void> {
        this.initialization ??= this.init();
        return this.initialization;
    }

    async save(lead: Omit<LeadRecord, 'id' | 'created_at'>): Promise<void> {
        await this.ensureInitialized();

        // Criptografia de dados sensíveis antes de salvar no banco Turso (LGPD / Proteção de PII)
        const encryptedNome = this.encryptionService.encrypt(lead.nome);
        const encryptedEmail = this.encryptionService.encrypt(lead.email);
        const encryptedWhatsapp = this.encryptionService.encrypt(lead.whatsapp);
        const encryptedComentario = this.encryptionService.encrypt(lead.comentario);

        await this.db.execute({
            sql: `
      INSERT INTO leads (nome, email, whatsapp, comentario, status)
      VALUES (?, ?, ?, ?, ?)
    `,
            args: [encryptedNome, encryptedEmail, encryptedWhatsapp, encryptedComentario, lead.status || 'enviado']
        });

        // A notificação interna recebe os dados originais legíveis em texto claro
        if (this.notificationService) {
            try {
                await this.notificationService.notifyNewLead({
                    nome: lead.nome,
                    email: lead.email,
                    whatsapp: lead.whatsapp,
                    comentario: lead.comentario,
                });
            } catch (error) {
                console.error('[TursoLeadRepository] Erro ao enviar notificação Brevo após salvar lead:', error);
            }
        }
    }

    async findAll(): Promise<LeadRecord[]> {
        await this.ensureInitialized();
        const result = await this.db.execute('SELECT * FROM leads ORDER BY created_at DESC');
        const rows = result.rows as unknown as LeadRecord[];

        // Descriptografa os dados para exibição autorizada (ex: rota /api/leads protegida por JWT)
        return rows.map((row) => ({
            ...row,
            nome: this.encryptionService.decrypt(row.nome),
            email: this.encryptionService.decrypt(row.email),
            whatsapp: this.encryptionService.decrypt(row.whatsapp),
            comentario: this.encryptionService.decrypt(row.comentario),
        }));
    }
}