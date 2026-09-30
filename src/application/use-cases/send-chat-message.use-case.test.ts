import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SendChatMessageUseCase } from './send-chat-message.use-case';
import { IAIAgentService } from '../../core/interfaces/ai-agent.interface';

describe('SendChatMessageUseCase', () => {
  it('deve lançar um erro quando o prompt estiver vazio', async () => {
    const mockAiService: IAIAgentService = {
      generateResponse: async () => 'mock resposta',
    };
    const useCase = new SendChatMessageUseCase(mockAiService);

    await assert.rejects(
      async () => {
        await useCase.execute([], '');
      },
      { message: 'A mensagem do usuário não pode estar vazia.' }
    );
  });

  it('deve retornar a resposta gerada com timestamp', async () => {
    const mockAiService: IAIAgentService = {
      generateResponse: async () => 'Olá! Como posso ajudar?',
    };
    const useCase = new SendChatMessageUseCase(mockAiService);

    const response = await useCase.execute([], 'Olá');
    assert.strictEqual(response.reply, 'Olá! Como posso ajudar?');
    assert.ok(response.timestamp instanceof Date);
  });
});
