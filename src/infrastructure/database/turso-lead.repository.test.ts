import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TursoLeadRepository } from './turso-lead.repository';
import { INotificationService, LeadNotificationData } from '../../core/interfaces/notification-service.interface';
import { EncryptionService } from '../security/encryption.service';
import { Client } from '@libsql/client';

describe('TursoLeadRepository', () => {
  const encryptionService = new EncryptionService();
  it('deve salvar o lead dinâmico no banco com os argumentos corretos', async () => {
    let executedSql: any[] = [];

    const mockClient = {
      execute: async (stmt: any) => {
        executedSql.push(stmt);
        if (typeof stmt === 'string' && stmt.includes('PRAGMA table_info')) {
          return { rows: [{ name: 'status' }] };
        }
        return { rows: [] };
      },
    } as unknown as Client;

    const repository = new TursoLeadRepository(mockClient);

    // Simula dados reais coletados dinamicamente na conversa do chat
    const leadColetadoNaConversa = {
      nome: 'Cliente Exemplo Chat',
      email: 'cliente@email.com',
      whatsapp: '11999998888',
      comentario: 'Dúvida sobre cobertura de fibra',
      status: 'enviado',
    };

    await repository.save(leadColetadoNaConversa);

    // Confirma que o INSERT no banco foi chamado com os dados devidamente criptografados
    const insertCall = executedSql.find(
      (call) => typeof call === 'object' && call.sql && call.sql.includes('INSERT INTO leads')
    );
    assert.ok(insertCall, 'O comando INSERT INTO leads deve ter sido executado');

    // Valida que os dados salvos no banco não estão em texto claro (protegidos contra vazamento)
    assert.ok(typeof insertCall.args[0] === 'string' && insertCall.args[0].startsWith('enc:v1:'));
    assert.ok(typeof insertCall.args[1] === 'string' && insertCall.args[1].startsWith('enc:v1:'));
    assert.ok(typeof insertCall.args[2] === 'string' && insertCall.args[2].startsWith('enc:v1:'));
    assert.ok(typeof insertCall.args[3] === 'string' && insertCall.args[3].startsWith('enc:v1:'));
    assert.strictEqual(insertCall.args[4], leadColetadoNaConversa.status);
  });

  it('deve descriptografar os dados ao consultar os leads via findAll', async () => {
    const rawEncryptedRows = [
      {
        id: 1,
        // Criptografado com prefixo enc:v1
        nome: encryptionService.encrypt('Cliente Criptografado'),
        email: encryptionService.encrypt('cliente@seguro.com'),
        whatsapp: encryptionService.encrypt('11999990000'),
        comentario: encryptionService.encrypt('Dúvida confidencial'),
        status: 'enviado',
        created_at: '2026-10-02 20:00:00',
      },
    ];

    const mockClient = {
      execute: async (stmt: any) => {
        if (typeof stmt === 'string' && stmt.includes('PRAGMA table_info')) {
          return { rows: [{ name: 'status' }] };
        }
        if (typeof stmt === 'string' && stmt.includes('SELECT * FROM leads')) {
          return { rows: rawEncryptedRows };
        }
        return { rows: [] };
      },
    } as unknown as Client;

    const repo = new TursoLeadRepository(mockClient);
    const leads = await repo.findAll();

    assert.strictEqual(leads.length, 1);
    assert.strictEqual(leads[0]?.nome, 'Cliente Criptografado');
    assert.strictEqual(leads[0]?.email, 'cliente@seguro.com');
    assert.strictEqual(leads[0]?.whatsapp, '11999990000');
    assert.strictEqual(leads[0]?.comentario, 'Dúvida confidencial');
  });

  it('deve acionar o serviço de notificação após salvar o lead no Turso', async () => {
    let notifiedLead: LeadNotificationData | null = null;

    const mockClient = {
      execute: async (stmt: any) => {
        if (typeof stmt === 'string' && stmt.includes('PRAGMA table_info')) {
          return { rows: [{ name: 'status' }] };
        }
        return { rows: [] };
      },
    } as unknown as Client;

    const mockNotificationService: INotificationService = {
      notifyNewLead: async (lead) => {
        notifiedLead = lead;
      },
    };

    const repository = new TursoLeadRepository(mockNotificationService, mockClient);

    const leadData = {
      nome: 'Maria Silva',
      email: 'maria@hadtelecom.net.br',
      whatsapp: '11977776666',
      comentario: 'Gostaria de proposta comercial',
      status: 'enviado',
    };

    await repository.save(leadData);

    assert.deepStrictEqual(notifiedLead, {
      nome: 'Maria Silva',
      email: 'maria@hadtelecom.net.br',
      whatsapp: '11977776666',
      comentario: 'Gostaria de proposta comercial',
    });
  });

  it('não deve quebrar o salvamento do lead se o serviço de notificação falhar', async () => {
    const mockClient = {
      execute: async (stmt: any) => {
        if (typeof stmt === 'string' && stmt.includes('PRAGMA table_info')) {
          return { rows: [{ name: 'status' }] };
        }
        return { rows: [] };
      },
    } as unknown as Client;

    const mockNotificationService: INotificationService = {
      notifyNewLead: async () => {
        throw new Error('Falha simulada na API Brevo');
      },
    };

    const repository = new TursoLeadRepository(mockNotificationService, mockClient);

    await assert.doesNotReject(async () => {
      await repository.save({
        nome: 'Lead Resiliente',
        email: 'resiliente@teste.com',
        whatsapp: '11955554444',
        comentario: 'Teste de resiliência',
      });
    });
  });
});
