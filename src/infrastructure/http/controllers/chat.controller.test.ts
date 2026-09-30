import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Request, Response } from 'express';
import { ChatController } from './chat.controller';
import { SendChatMessageUseCase } from '../../../application/use-cases/send-chat-message.use-case';

interface MockResponse {
  statusCode: number;
  body: any;
  status: (code: number) => MockResponse;
  json: (data: any) => MockResponse;
}

const createMockResponse = (): MockResponse => {
  const res: MockResponse = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
  };
  return res;
};

describe('ChatController', () => {
  it('deve retornar status 200 e a resposta do use case em caso de sucesso', async () => {
    const mockUseCase = {
      execute: async () => ({
        reply: 'Resposta da IA com sucesso',
        timestamp: new Date('2026-09-30T10:00:00Z'),
      }),
    } as unknown as SendChatMessageUseCase;

    const controller = new ChatController(mockUseCase);
    const req = {
      body: {
        history: [{ role: 'user', content: 'Olá' }],
        message: 'Qual o valor dos planos?',
      },
    } as Request;
    const res = createMockResponse();

    await controller.handle(req, res as unknown as Response);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.reply, 'Resposta da IA com sucesso');
    assert.deepStrictEqual(res.body.timestamp, new Date('2026-09-30T10:00:00Z'));
  });

  it('deve utilizar um histórico vazio como padrão caso req.body.history não seja informado', async () => {
    let passedHistory: any = null;

    const mockUseCase = {
      execute: async (history: any) => {
        passedHistory = history;
        return {
          reply: 'Resposta padrão',
          timestamp: new Date(),
        };
      },
    } as unknown as SendChatMessageUseCase;

    const controller = new ChatController(mockUseCase);
    const req = {
      body: {
        message: 'Teste de mensagem sem historico',
      },
    } as Request;
    const res = createMockResponse();

    await controller.handle(req, res as unknown as Response);

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(passedHistory, []);
  });

  it('deve retornar status 400 e a mensagem de erro quando o use case lançar uma exceção', async () => {
    const mockUseCase = {
      execute: async () => {
        throw new Error('A mensagem do usuário não pode estar vazia.');
      },
    } as unknown as SendChatMessageUseCase;

    const controller = new ChatController(mockUseCase);
    const req = {
      body: {
        message: '',
      },
    } as Request;
    const res = createMockResponse();

    await controller.handle(req, res as unknown as Response);

    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.body, { error: 'A mensagem do usuário não pode estar vazia.' });
  });

  it('deve retornar a mensagem de erro padrão caso o erro lançado não possua message', async () => {
    const mockUseCase = {
      execute: async () => {
        throw 'Erro sem propriedade message';
      },
    } as unknown as SendChatMessageUseCase;

    const controller = new ChatController(mockUseCase);
    const req = {
      body: {
        message: 'Ola',
      },
    } as Request;
    const res = createMockResponse();

    await controller.handle(req, res as unknown as Response);

    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.body, { error: 'Erro ao processar mensagem.' });
  });
});
