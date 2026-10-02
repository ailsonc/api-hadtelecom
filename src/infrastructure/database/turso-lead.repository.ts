import { createClient, type Client } from '@libsql/client';

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
    private initialization?: Promise<void>;

    constructor() {
        const url = process.env.DATABASE_URL;
        const authToken = process.env.DATABASE_TOKEN;
        if (!url || !authToken) {
            throw new Error('DATABASE_URL e DATABASE_TOKEN são obrigatórios para conectar ao Turso.');
        }
        this.db = createClient({ url, authToken });
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
        await this.db.execute({
            sql: `
      INSERT INTO leads (nome, email, whatsapp, comentario, status)
      VALUES (?, ?, ?, ?, ?)
    `,
            args: [lead.nome, lead.email, lead.whatsapp, lead.comentario, lead.status || 'enviado']
        });
    }

    async findAll(): Promise<LeadRecord[]> {
        await this.ensureInitialized();
        const result = await this.db.execute('SELECT * FROM leads ORDER BY created_at DESC');
        return result.rows as unknown as LeadRecord[];
    }
}