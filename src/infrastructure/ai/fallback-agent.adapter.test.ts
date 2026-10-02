import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FallbackAgentAdapter } from './fallback-agent.adapter';
import { IAIAgentService } from '../../core/interfaces/ai-agent.interface';
import { ChatMessage } from '../../core/domain/chat.entity';

describe('FallbackAgentAdapter', () => {
  const dummyHistory: ChatMessage[] = [{ role: 'user', content: 'Olá' }];
  const dummyPrompt = 'Quero contratar internet';

  it('deve retornar a resposta do provedor principal quando este responde com sucesso', async () => {
    let secondCalled = false;

    const mockPrimary: IAIAgentService = {
      generateResponse: async () => 'Resposta do GROQ',
    };

    const mockSecondary: IAIAgentService = {
      generateResponse: async () => {
        secondCalled = true;
        return 'Resposta do GEMINI';
      },
    };

    const fallback = new FallbackAgentAdapter([
      { name: 'GROQ', provider: mockPrimary },
      { name: 'GEMINI', provider: mockSecondary },
    ]);

    const result = await fallback.generateResponse(dummyHistory, dummyPrompt);

    assert.strictEqual(result, 'Resposta do GROQ');
    assert.strictEqual(secondCalled, false, 'O segundo provedor não deve ser chamado quando o primeiro responde com sucesso');
  });

  it('deve mudar para o segundo provedor quando o primeiro falhar com erro', async () => {
    const mockPrimary: IAIAgentService = {
      generateResponse: async () => {
        throw new Error('Falha de conexão com a API do Groq');
      },
    };

    const mockSecondary: IAIAgentService = {
      generateResponse: async () => 'Resposta do GEMINI após falha do Groq',
    };

    const fallback = new FallbackAgentAdapter([
      { name: 'GROQ', provider: mockPrimary },
      { name: 'GEMINI', provider: mockSecondary },
    ]);

    const result = await fallback.generateResponse(dummyHistory, dummyPrompt);

    assert.strictEqual(result, 'Resposta do GEMINI após falha do Groq');
  });

  it('deve mudar para o segundo provedor quando o primeiro demorar além do timeout configurado', async () => {
    const mockPrimary: IAIAgentService = {
      generateResponse: async () => {
        // Simula um provedor lento
        await new Promise((resolve) => setTimeout(resolve, 150));
        return 'Resposta muito tardia do GROQ';
      },
    };

    const mockSecondary: IAIAgentService = {
      generateResponse: async () => 'Resposta rápida do GEMINI',
    };

    const fallback = new FallbackAgentAdapter(
      [
        { name: 'GROQ', provider: mockPrimary, timeoutMs: 30 },
        { name: 'GEMINI', provider: mockSecondary, timeoutMs: 200 },
      ]
    );

    const result = await fallback.generateResponse(dummyHistory, dummyPrompt);

    assert.strictEqual(result, 'Resposta rápida do GEMINI');
  });

  it('deve detectar limite ou sobrecarga (status 429 ou 503) e mudar imediatamente para o outro provedor', async () => {
    const rateLimitError: any = new Error('Rate limit reached for model qwen/qwen3.8-27b');
    rateLimitError.status = 429;

    const mockPrimary: IAIAgentService = {
      generateResponse: async () => {
        throw rateLimitError;
      },
    };

    const mockSecondary: IAIAgentService = {
      generateResponse: async () => 'Resposta do GEMINI contornando o limite 429',
    };

    const fallback = new FallbackAgentAdapter([
      { name: 'GROQ', provider: mockPrimary },
      { name: 'GEMINI', provider: mockSecondary },
    ]);

    const result = await fallback.generateResponse(dummyHistory, dummyPrompt);

    assert.strictEqual(result, 'Resposta do GEMINI contornando o limite 429');
  });

  it('deve permitir encadear facilmente um terceiro provedor se o primeiro e segundo falharem', async () => {
    const mockPrimary: IAIAgentService = {
      generateResponse: async () => {
        throw new Error('Groq 503 Sobrecarga');
      },
    };

    const mockSecondary: IAIAgentService = {
      generateResponse: async () => {
        throw new Error('Gemini Quota Exceeded 429');
      },
    };

    const mockThird: IAIAgentService = {
      generateResponse: async () => 'Resposta do TERCEIRO provedor (ex: OpenAI)',
    };

    const fallback = new FallbackAgentAdapter([
      { name: 'GROQ', provider: mockPrimary },
      { name: 'GEMINI', provider: mockSecondary },
      { name: 'TERCEIRO_PROVEDOR', provider: mockThird },
    ]);

    const result = await fallback.generateResponse(dummyHistory, dummyPrompt);

    assert.strictEqual(result, 'Resposta do TERCEIRO provedor (ex: OpenAI)');
  });

  it('deve lançar erro detalhado quando todos os provedores da cadeia falharem', async () => {
    const mockPrimary: IAIAgentService = {
      generateResponse: async () => {
        throw new Error('Groq offline');
      },
    };

    const mockSecondary: IAIAgentService = {
      generateResponse: async () => {
        throw new Error('Gemini offline');
      },
    };

    const fallback = new FallbackAgentAdapter([
      { name: 'GROQ', provider: mockPrimary },
      { name: 'GEMINI', provider: mockSecondary },
    ]);

    await assert.rejects(
      async () => {
        await fallback.generateResponse(dummyHistory, dummyPrompt);
      },
      (err: any) => {
        assert.ok(err.message.includes('Todos os provedores de IA falharam'));
        assert.ok(err.message.includes('[GROQ]'));
        assert.ok(err.message.includes('[GEMINI]'));
        return true;
      }
    );
  });

  it('deve validar que ao menos um provedor seja informado no construtor', () => {
    assert.throws(
      () => new FallbackAgentAdapter([]),
      /FallbackAgentAdapter precisa de pelo menos um provedor configurado/
    );
  });

  it('deve permitir adicionar provedores dinamicamente via addProvider', () => {
    const mockPrimary: IAIAgentService = {
      generateResponse: async () => 'OK',
    };
    const mockExtra: IAIAgentService = {
      generateResponse: async () => 'OK Extra',
    };

    const fallback = new FallbackAgentAdapter([
      { name: 'GROQ', provider: mockPrimary },
    ]);

    assert.strictEqual(fallback.getProviders().length, 1);

    fallback.addProvider({ name: 'TERCEIRO', provider: mockExtra });

    assert.strictEqual(fallback.getProviders().length, 2);
    assert.strictEqual(fallback.getProviders()[1]?.name, 'TERCEIRO');
  });
});
