import { describe, it } from 'node:test';
import assert from 'node:assert';
import { NtfyNotificationService } from './ntfy-notification.service';
import { LeadNotificationData } from '../../core/interfaces/notification-service.interface';

describe('NtfyNotificationService', () => {
  const dummyLead: LeadNotificationData = {
    nome: 'Ailson Costa',
    email: 'ailson@hadtelecom.net.br',
    whatsapp: '11999999999',
    comentario: 'Gostaria de saber mais sobre links dedicados',
  };

  it('deve enviar a notificação formatada com nome, email, whatsapp e comentario via POST', async () => {
    let calledUrl = '';
    let calledOptions: RequestInit | undefined;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      calledUrl = input.toString();
      calledOptions = init;
      return new Response('OK', { status: 200 });
    }) as typeof fetch;

    try {
      const service = new NtfyNotificationService('https://ntfy.sh/hadtelecom2026');
      await service.notifyNewLead(dummyLead);

      assert.strictEqual(calledUrl, 'https://ntfy.sh/hadtelecom2026');
      assert.strictEqual(calledOptions?.method, 'POST');

      const expectedBody = [
        'Novo cadastro na API: Ailson Costa',
        'E-mail: ailson@hadtelecom.net.br',
        'WhatsApp: 11999999999',
        'Comentário: Gostaria de saber mais sobre links dedicados',
      ].join('\n');

      assert.strictEqual(calledOptions?.body, expectedBody);
      assert.deepStrictEqual(calledOptions?.headers, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Title': 'Novo cadastro na API',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('não deve lançar erro caso a requisição HTTP retorne status diferente de 2xx', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    }) as typeof fetch;

    try {
      const service = new NtfyNotificationService('https://ntfy.sh/hadtelecom2026');
      await assert.doesNotReject(async () => {
        await service.notifyNewLead(dummyLead);
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('não deve lançar erro caso ocorra falha de rede/conexão na chamada fetch', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('Falha de conexão com a internet');
    }) as typeof fetch;

    try {
      const service = new NtfyNotificationService('https://ntfy.sh/hadtelecom2026');
      await assert.doesNotReject(async () => {
        await service.notifyNewLead(dummyLead);
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
