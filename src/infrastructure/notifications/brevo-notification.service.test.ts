import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BrevoNotificationService } from './brevo-notification.service';
import { LeadNotificationData } from '../../core/interfaces/notification-service.interface';

describe('BrevoNotificationService', () => {
  const dummyLead: LeadNotificationData = {
    nome: 'Carlos Souza',
    email: 'carlos@empresa.com',
    whatsapp: '11988887777',
    comentario: 'Interesse em plano dedicado para provedor',
  };

  it('deve enviar o e-mail formatado via POST para a API da Brevo com a api-key no header', async () => {
    let calledUrl = '';
    let calledOptions: RequestInit | undefined;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      calledUrl = input.toString();
      calledOptions = init;
      return new Response(JSON.stringify({ messageId: 'msg-123' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const service = new BrevoNotificationService(
        'xkeysib-teste-123',
        'contato@hadtelecom.net.br',
        'ailsonlcosta@gmail.com'
      );

      await service.notifyNewLead(dummyLead);

      assert.strictEqual(calledUrl, 'https://api.brevo.com/v3/smtp/email');
      assert.strictEqual(calledOptions?.method, 'POST');

      const headers = calledOptions?.headers as Record<string, string>;
      assert.strictEqual(headers['Content-Type'], 'application/json');
      assert.strictEqual(headers['api-key'], 'xkeysib-teste-123');

      const body = JSON.parse(calledOptions?.body as string);
      assert.deepStrictEqual(body.sender, {
        name: 'Notificações',
        email: 'contato@hadtelecom.net.br',
      });
      assert.deepStrictEqual(body.to, [{ email: 'ailsonlcosta@gmail.com' }]);
      assert.strictEqual(body.subject, 'Novo cadastro: Carlos Souza');

      const expectedText = [
        'Nome: Carlos Souza',
        'E-mail: carlos@empresa.com',
        'WhatsApp: 11988887777',
        'Comentário: Interesse em plano dedicado para provedor',
      ].join('\n');
      assert.strictEqual(body.textContent, expectedText);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('não deve lançar exceção caso a API da Brevo retorne erro HTTP', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ message: 'Invalid API key' }), {
        status: 401,
        statusText: 'Unauthorized',
      });
    }) as typeof fetch;

    try {
      const service = new BrevoNotificationService(
        'invalid-key',
        'contato@hadtelecom.net.br',
        'ailsonlcosta@gmail.com'
      );

      await assert.doesNotReject(async () => {
        await service.notifyNewLead(dummyLead);
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('não deve lançar exceção caso ocorra falha de rede/conexão no fetch', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('Falha de conexão com a API da Brevo');
    }) as typeof fetch;

    try {
      const service = new BrevoNotificationService(
        'xkeysib-teste',
        'contato@hadtelecom.net.br',
        'ailsonlcosta@gmail.com'
      );

      await assert.doesNotReject(async () => {
        await service.notifyNewLead(dummyLead);
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('não deve realizar a requisição HTTP se faltar a api-key ou senderEmail', async () => {
    let fetchCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response('OK', { status: 200 });
    }) as typeof fetch;

    try {
      const service = new BrevoNotificationService('', '', 'ailsonlcosta@gmail.com');
      await service.notifyNewLead(dummyLead);

      assert.strictEqual(fetchCalled, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
