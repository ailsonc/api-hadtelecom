import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GoogleAgentAdapter } from './google-agent.adapter';
import { ChatMessage } from '../../core/domain/chat.entity';

describe('GoogleAgentAdapter', () => {
  it('deve inicializar com valores padrão e variáveis customizadas', () => {
    const adapter = new GoogleAgentAdapter(
      'gemini_test_key',
      'Descrição Teste Google',
      'Instrução Teste Google',
      'gemini-2.5-pro'
    );

    assert.strictEqual(adapter.description, 'Descrição Teste Google');
    assert.strictEqual(adapter.instruction, 'Instrução Teste Google');
    assert.strictEqual(adapter.model, 'gemini-2.5-pro');
  });

  it('deve formatar o histórico e chamar chats.create e sendMessage', async () => {
    const adapter = new GoogleAgentAdapter('gemini_test_key');

    let createParams: any;
    let sentMessage: any;

    (adapter as any).client = {
      chats: {
        create: (params: any) => {
          createParams = params;
          return {
            sendMessage: async (msgParams: any) => {
              sentMessage = msgParams;
              return { text: 'Resposta do Gemini' };
            },
          };
        },
      },
    };

    const history: ChatMessage[] = [
      { role: 'user', content: 'Olá' },
      { role: 'model', content: 'Como posso ajudar?' },
    ];

    const response = await adapter.generateResponse(history, 'Quais são os planos?');

    assert.strictEqual(response, 'Resposta do Gemini');
    assert.strictEqual(createParams.history.length, 2);
    assert.deepStrictEqual(createParams.history[0], {
      role: 'user',
      parts: [{ text: 'Olá' }],
    });
    assert.deepStrictEqual(createParams.history[1], {
      role: 'model',
      parts: [{ text: 'Como posso ajudar?' }],
    });
    assert.deepStrictEqual(sentMessage, { message: 'Quais são os planos?' });
  });

  it('deve retornar mensagem amigável caso a resposta venha sem texto', async () => {
    const adapter = new GoogleAgentAdapter('gemini_test_key');

    (adapter as any).client = {
      chats: {
        create: () => ({
          sendMessage: async () => ({ text: null }),
        }),
      },
    };

    const response = await adapter.generateResponse([], 'Teste');
    assert.strictEqual(response, 'Sem resposta do modelo.');
  });
});
