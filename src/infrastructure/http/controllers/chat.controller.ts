import { Request, Response } from 'express';
import { SendChatMessageUseCase } from '../../../application/use-cases/send-chat-message.use-case';

export class ChatController {
  constructor(private readonly useCase: SendChatMessageUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { history = [], message } = req.body;
      const result = await this.useCase.execute(history, message);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao processar mensagem.' });
    }
  }
}