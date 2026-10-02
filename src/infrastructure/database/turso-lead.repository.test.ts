import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TursoLeadRepository } from './turso-lead.repository';
import { INotificationService, LeadNotificationData } from '../../core/interfaces/notification-service.interface';
import { Client } from '@libsql/client';

describe('TursoLeadRepository', () => {
  it('deve salvar o lead dinâmico no banco e repassar exatamente os mesmos dados para a notificação', async () => {
    let executedSql: any[] = [];
    let notifiedLead: LeadNotificationData | null = null;

    const mockClient = {
      execute: async (stmt: any) => {
        executedSql.push(stmt);
        if (typeof stmt === 'string' && stmt.includes('PRAGMA table_info')) {
          return { rows: [{ name: 'status' }] };
        }
        return { rows: [] };
      },
    } as unknown as Client;

    const mockNotificationService: INotificationService = {
      notifyNewLead: async (lead: LeadNotificationData) => {
        notifiedLead = lead;
      },
    };

    const repository = new TursoLeadRepository(mockNotificationService, mockClient);

    // Simula dados reais coletados dinamicamente na conversa do chat
    const leadColetadoNaConversa = {
      nome: 'Cliente Exemplo Chat',
      email: 'cliente@email.com',
      whatsapp: '11999998888',
      comentario: 'Dúvida sobre cobertura de fibra',
      status: 'enviado',
    };

    await repository.save(leadColetadoNaConversa);

    // Confirma que a notificação recebeu exatamente os mesmos dados coletados
    assert.deepStrictEqual(notifiedLead, {
      nome: leadColetadoNaConversa.nome,
      email: leadColetadoNaConversa.email,
      whatsapp: leadColetadoNaConversa.whatsapp,
      comentario: leadColetadoNaConversa.comentario,
    });

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

  it('não deve falhar o salvamento no banco se o serviço de notificação falhar', async () => {
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
        throw new Error('Falha no webhook NTFY');
      },
    };

    const repository = new TursoLeadRepository(mockNotificationService, mockClient);

    await assert.doesNotReject(async () => {
      await repository.save({
        nome: 'Cliente Teste',
        email: 'teste@email.com',
        whatsapp: '11900000000',
        comentario: 'Teste de resiliência',
      });
    });
  });
});
