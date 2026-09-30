import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { securityMiddlewares } from './infrastructure/http/middlewares/security.middleware';
import { GoogleAgentAdapter } from './infrastructure/ai/google-agent.adapter';
import { SendChatMessageUseCase } from './application/use-cases/send-chat-message.use-case';
import { ChatController } from './infrastructure/http/controllers/chat.controller';

if (process.argv.includes('--dev')) {
  process.env.NODE_ENV = 'development';
}

const app = express();
app.use(express.json());
app.use(securityMiddlewares);

// Injeção de dependências
const aiAdapter = new GoogleAgentAdapter(process.env.GEMINI_API_KEY || '');
const sendChatUseCase = new SendChatMessageUseCase(aiAdapter);
const chatController = new ChatController(sendChatUseCase);

app.post('/api/chat', (req, res) => chatController.handle(req, res));

// Middleware de tratamento de erros (incluindo CORS)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err && err.message && err.message.includes('CORS')) {
    res.status(403).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Erro interno no servidor.' });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT} [Ambiente: ${process.env.NODE_ENV || 'production'}]`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERRO: A porta ${PORT} já está em uso por outro processo ou contêiner Docker!`);
    console.error(`Altere a variável PORT no seu arquivo .env (ex: PORT=3001) ou encerre o processo que está usando a porta ${PORT}.\n`);
  } else {
    console.error('Erro no servidor:', err);
  }
});