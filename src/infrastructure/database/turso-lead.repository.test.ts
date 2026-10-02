import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TursoLeadRepository } from './turso-lead.repository';
import { INotificationService, LeadNotificationData } from '../../core/interfaces/notification-service.interface';
import { Client } from '@libsql/client';

describe('TursoLeadRepository', () => {
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

    // Confirma que o INSERT no banco foi chamado com os argumentos coletados
    const insertCall = executedSql.find(
      (call) => typeof call === 'object' && call.sql && call.sql.includes('INSERT INTO leads')
    );
    assert.ok(insertCall, 'O comando INSERT INTO leads deve ter sido executado');
    assert.deepStrictEqual(insertCall.args, [
      leadColetadoNaConversa.nome,
      leadColetadoNaConversa.email,
      leadColetadoNaConversa.whatsapp,
      leadColetadoNaConversa.comentario,
      leadColetadoNaConversa.status,
    ]);
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
