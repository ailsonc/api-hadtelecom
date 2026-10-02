import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SendChatMessageUseCase } from './send-chat-message.use-case';
import { IAIAgentService } from '../../core/interfaces/ai-agent.interface';
import { ILeadRepository, LeadRecord } from '../../infrastructure/database/turso-lead.repository';
import { ChatMessage } from '../../core/domain/chat.entity';

describe('SendChatMessageUseCase', () => {
  describe('Validação de entrada', () => {
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

    it('deve lançar um erro quando o prompt contiver apenas espaços em branco', async () => {
      const mockAiService: IAIAgentService = {
        generateResponse: async () => 'mock resposta',
      };
      const useCase = new SendChatMessageUseCase(mockAiService);

      await assert.rejects(
        async () => {
          await useCase.execute([], '   \n\t  ');
        },
        { message: 'A mensagem do usuário não pode estar vazia.' }
      );
    });
  });

  describe('Fluxo de conversação padrão', () => {
    it('deve retornar a resposta gerada com timestamp', async () => {
      const mockAiService: IAIAgentService = {
        generateResponse: async () => 'Olá! Como posso ajudar?',
      };
      const useCase = new SendChatMessageUseCase(mockAiService);

      const response = await useCase.execute([], 'Olá');
      assert.strictEqual(response.reply, 'Olá! Como posso ajudar?');
      assert.ok(response.timestamp instanceof Date);
    });

    it('deve repassar o histórico e prompt corretamente para o IA service', async () => {
      let passedHistory: ChatMessage[] = [];
      let passedPrompt = '';

      const mockAiService: IAIAgentService = {
        generateResponse: async (history, prompt) => {
          passedHistory = history;
          passedPrompt = prompt;
          return 'Resposta do assistente';
        },
      };
      const useCase = new SendChatMessageUseCase(mockAiService);

      const historyInput: ChatMessage[] = [
        { role: 'user', content: 'Oi' },
        { role: 'model', content: 'Olá! Como posso ajudar?' },
      ];

      await useCase.execute(historyInput, 'Quero saber sobre planos');

      assert.deepStrictEqual(passedHistory, historyInput);
      assert.strictEqual(passedPrompt, 'Quero saber sobre planos');
    });
  });

  describe('Captura e persistência de Leads', () => {
    it('deve extrair os dados do lead, salvar no repositório e remover o bloco LEAD_DATA da resposta', async () => {
      const rawAiResponse = `Obrigado pelas informações! Um especialista entrará em contato em breve.
<<<LEAD_DATA
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "whatsapp": "11999999999",
  "comentario": "Interesse em TR-069"
}
LEAD_DATA>>>`;

      let capturedLead: Omit<LeadRecord, 'id' | 'created_at'> | null = null;
      const mockLeadRepo: ILeadRepository = {
        save: async (lead) => {
          capturedLead = lead;
        },
        findAll: async () => [],
      };

      const mockAiService: IAIAgentService = {
        generateResponse: async () => rawAiResponse,
      };

      const useCase = new SendChatMessageUseCase(mockAiService, mockLeadRepo);
      const response = await useCase.execute([], 'Aqui estão meus dados');

      // Verifica se a resposta foi limpa sem o bloco técnico e status foi retornado
      assert.strictEqual(
        response.reply,
        'Obrigado pelas informações! Um especialista entrará em contato em breve.'
      );
      assert.strictEqual(response.status, 'enviado');

      // Verifica se o lead foi passado corretamente para o repositório com status
      assert.deepStrictEqual(capturedLead, {
        nome: 'João Silva',
        email: 'joao@email.com',
        whatsapp: '11999999999',
        comentario: 'Interesse em TR-069',
        status: 'enviado',
      });
    });

    it('não deve lançar exceção nem quebrar a resposta quando o JSON do lead for inválido', async () => {
      const rawAiResponse = `Recebido!
<<<LEAD_DATA
{ nome: "Incompleto" sem_fechar_aspas
LEAD_DATA>>>`;

      let repoCalled = false;
      const mockLeadRepo: ILeadRepository = {
        save: async () => {
          repoCalled = true;
        },
        findAll: async () => [],
      };

      const mockAiService: IAIAgentService = {
        generateResponse: async () => rawAiResponse,
      };

      const useCase = new SendChatMessageUseCase(mockAiService, mockLeadRepo);
      const response = await useCase.execute([], 'Dados');

      assert.strictEqual(response.reply, 'Recebido!');
      assert.strictEqual(repoCalled, false);
      assert.ok(response.timestamp instanceof Date);
    });

    it('não deve quebrar o fluxo se o repositório de lead falhar ao salvar', async () => {
      const rawAiResponse = `Sucesso!
<<<LEAD_DATA
{
  "nome": "Maria",
  "email": "maria@email.com",
  "whatsapp": "21988888888",
  "comentario": "Economia circular"
}
LEAD_DATA>>>`;

      const mockLeadRepo: ILeadRepository = {
        save: async () => {
          throw new Error('Falha no banco Turso');
        },
        findAll: async () => [],
      };

      const mockAiService: IAIAgentService = {
        generateResponse: async () => rawAiResponse,
      };

      const useCase = new SendChatMessageUseCase(mockAiService, mockLeadRepo);
      const response = await useCase.execute([], 'Meus dados');

      assert.strictEqual(response.reply, 'Sucesso!');
      assert.ok(response.timestamp instanceof Date);
    });
  });
});
