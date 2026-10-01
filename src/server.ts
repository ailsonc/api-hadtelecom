import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { securityMiddlewares } from './infrastructure/http/middlewares/security.middleware';
import { GroqAgentAdapter } from './infrastructure/ai/groq-agent.adapter';
import { SendChatMessageUseCase } from './application/use-cases/send-chat-message.use-case';
import { ChatController } from './infrastructure/http/controllers/chat.controller';
import { AuthController } from './infrastructure/http/controllers/auth.controller';
import { authenticateToken } from './infrastructure/http/middlewares/auth.middleware';
import { SqliteLeadRepository } from './infrastructure/database/sqlite-lead.repository';

const app = express();
app.use(express.json());
app.use(securityMiddlewares);

// Injeção de dependências
const leadRepo = new SqliteLeadRepository();
const aiAdapter = new GroqAgentAdapter(process.env.GROQ_API_KEY || '');
const sendChatUseCase = new SendChatMessageUseCase(aiAdapter, leadRepo);
const chatController = new ChatController(sendChatUseCase);
const authController = new AuthController();

// Rota pública do Chat
app.post('/api/chat', (req: Request, res: Response) => chatController.handle(req, res));

// Rota de Login (Pública)
app.post('/api/login', (req: Request, res: Response) => authController.login(req, res));

// Rota de Consulta de Leads (Protegida por Token)
app.get('/api/leads', authenticateToken, (_req: Request, res: Response) => {
  const leads = leadRepo.findAll();
  res.status(200).json(leads);
});

// Middleware de tratamento de erros
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err && err.message && err.message.includes('CORS')) {
    res.status(403).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Erro interno no servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT} [Ambiente: ${process.env.NODE_ENV || 'production'}]`);
});