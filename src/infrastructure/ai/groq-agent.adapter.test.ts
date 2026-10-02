import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GroqAgentAdapter } from './groq-agent.adapter';
import { ChatMessage } from '../../core/domain/chat.entity';

describe('GroqAgentAdapter', () => {
  it('deve inicializar com valores padrão e variáveis customizadas', () => {
    const adapter = new GroqAgentAdapter(
      'gsk_test_key',
      'Descrição Teste',
      'Instrução Teste',
      'llama-3.1-8b-instant'
    );

    assert.strictEqual(adapter.description, 'Descrição Teste');
    assert.strictEqual(adapter.instruction, 'Instrução Teste');
    assert.strictEqual(adapter.model, 'llama-3.1-8b-instant');
    assert.strictEqual(adapter.maxTokens, 700);
  });

  it('deve aceitar maxTokens customizado via construtor', () => {
    const adapter = new GroqAgentAdapter(
      'gsk_test_key',
      undefined,
      undefined,
      undefined,
      500
    );
    assert.strictEqual(adapter.maxTokens, 500);
  });

  it('deve formatar o histórico mapeando role "model" para "assistant"', async () => {
    const adapter = new GroqAgentAdapter('gsk_test_key');

    let interceptedMessages: any[] = [];
    let interceptedParams: any = null;

    // Mock do client Groq
    (adapter as any).client = {
      chat: {
        completions: {
          create: async (params: any) => {
            interceptedParams = params;
            interceptedMessages = params.messages;
            return {
              choices: [
                {
                  message: {
                    content: 'Resposta do modelo Groq',
                  },
                },
              ],
            };
          },
        },
      },
    };

    const history: ChatMessage[] = [
      { role: 'user', content: 'Olá' },
      { role: 'model', content: 'Olá, como posso ajudar?' },
    ];

    const response = await adapter.generateResponse(history, 'Qual o horário de atendimento?');

    assert.strictEqual(response, 'Resposta do modelo Groq');
    assert.strictEqual(interceptedParams?.max_tokens, 700);
    assert.strictEqual(interceptedMessages.length, 4);
    assert.strictEqual(interceptedMessages[0].role, 'system');
    assert.strictEqual(interceptedMessages[1].role, 'user');
    assert.strictEqual(interceptedMessages[1].content, 'Olá');
    assert.strictEqual(interceptedMessages[2].role, 'assistant');
    assert.strictEqual(interceptedMessages[2].content, 'Olá, como posso ajudar?');
    assert.strictEqual(interceptedMessages[3].role, 'user');
    assert.strictEqual(interceptedMessages[3].content, 'Qual o horário de atendimento?');
  });

  it('deve retornar mensagem amigável caso a resposta venha vazia', async () => {
    const adapter = new GroqAgentAdapter('gsk_test_key');

    (adapter as any).client = {
      chat: {
        completions: {
          create: async () => ({
            choices: [],
          }),
        },
      },
    };

    const response = await adapter.generateResponse([], 'Teste');
    assert.strictEqual(response, 'Sem resposta do modelo.');
  });
});
