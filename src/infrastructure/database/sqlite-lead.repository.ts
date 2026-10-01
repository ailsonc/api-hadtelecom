import Database from 'better-sqlite3';
import path from 'node:path';

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
    save(lead: Omit<LeadRecord, 'id' | 'created_at'>): void;
    findAll(): LeadRecord[];
}

export class SqliteLeadRepository implements ILeadRepository {
    private db: Database.Database;

    constructor() {
        // Cria ou abre o arquivo 'leads.db' na raiz do projeto
        const dbPath = path.resolve(process.cwd(), 'leads.db');
        this.db = new Database(dbPath);

        // Otimização recomendada para concorrência e velocidade
        this.db.pragma('journal_mode = WAL');

        // Inicializa a tabela caso ela não exista
        this.init();
    }

    private init(): void {
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
        this.db.exec(query);

        // Migração suave caso a tabela já existisse sem a coluna status
        const columns = this.db.pragma('table_info(leads)') as Array<{ name: string }>;
        const hasStatus = columns.some((col) => col.name === 'status');
        if (!hasStatus) {
            this.db.exec("ALTER TABLE leads ADD COLUMN status TEXT DEFAULT 'enviado'");
        }
    }

    save(lead: Omit<LeadRecord, 'id' | 'created_at'>): void {
        const stmt = this.db.prepare(`
      INSERT INTO leads (nome, email, whatsapp, comentario, status)
      VALUES (@nome, @email, @whatsapp, @comentario, @status)
    `);

        stmt.run({
            ...lead,
            status: lead.status || 'enviado'
        });
    }

    findAll(): LeadRecord[] {
        const stmt = this.db.prepare('SELECT * FROM leads ORDER BY created_at DESC');
        return stmt.all() as LeadRecord[];
    }
}