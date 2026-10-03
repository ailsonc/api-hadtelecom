<p align="center">
  <img src="./HAD.png" alt="HadTelecom Logo" width="240" />
</p>

<h1 align="center">🚀 HadTelecom API — Intelligent AI Chatbot & Lead Generation Engine</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22.x-green?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express-5.x-lightgrey?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/Database-Turso%20LibSQL-cyan?style=for-the-badge&logo=sqlite" alt="Turso" />
  <img src="https://img.shields.io/badge/AI-Groq%20%7C%20Gemini-orange?style=for-the-badge" alt="AI" />
  <img src="https://img.shields.io/badge/Security-AES--256--GCM-red?style=for-the-badge" alt="AES-256-GCM" />
  <img src="https://img.shields.io/badge/Tests-57%20Passing-brightgreen?style=for-the-badge" alt="Tests" />
</p>

---

## 📖 Visão Geral

A **HadTelecom API** é o núcleo de inteligência conversacional e automação comercial da **[HadTelecom](https://hadtelecom.net.br)**. Desenvolvida sob os rigorosos princípios de **Clean Architecture** e **Domain-Driven Design (DDD)**, a solução provê um assistente virtual consultivo capaz de atender clientes em tempo real, tirar dúvidas técnicas sobre telecomunicações (links dedicados, banda larga fibra óptica, ASN, TR-069) e qualificar ativamente leads comerciais.

Quando um visitante decide solicitar uma proposta ou contato, o sistema extrai autonomamente os dados cadastrais, criptografa as informações confidenciais em repouso no banco de dados distribuído **Turso** e dispara alertas transacionais imediatos para a equipe comercial via **Brevo API**.

---

## ✨ Principais Diferenciais & Funcionalidades

### 1. 🔀 Motor de IA com Fallback Automático e Resiliente
- **Provedor Primário (GROQ Cloud)**: Inferência de altíssima performance utilizando o modelo `qwen/qwen3.8-27b` limitado a 700 tokens para respostas concisas e assertivas.
- **Provedor Secundário (Google Gemini)**: Ativação instantânea do modelo `gemini-3.8-flash` via `@google/genai` (máx. 700 tokens) caso o provedor principal demore ou falhe.
- **Detecção Inteligente de Falhas**:
  - **Timeout Monitor**: Comuta de provedor se a IA demorar mais que o tempo configurado (`AI_TIMEOUT_MS=10000`, 10 segundos).
  - **Limite e Sobrecarga (429 / 503 / Quota)**: Detecta erros de cota e sobrecarga, trocando de provedor em milissegundos sem travar o chat do usuário.
- **Open-Closed Principle (SOLID)**: Extensível para adicionar um 3º provedor (ex: OpenAI, Anthropic) com apenas uma linha de código.

### 2. 🔐 Segurança de Dados e Conformidade LGPD (AES-256-GCM)
- **Criptografia em Repouso**: Dados sensíveis do cliente (`nome`, `email`, `whatsapp` e `comentario`) são criptografados antes de serem persistidos no banco de dados.
- **Padrão Criptográfico Militar**: Utiliza `AES-256-GCM` com vetor de inicialização (IV) aleatório de 12 bytes gerado a cada campo e tag de autenticação HMAC. Mesmo que haja acesso não autorizado direto às tabelas do banco, os dados são indecifráveis.
- **Descriptografia Transparente**: Clientes autorizados e autenticados via JWT recebem os dados legíveis na rota administrativa.
- **Compatibilidade Retroativa**: Leitura graciosa de dados legados não criptografados sem interrupções.

### 3. ✉️ Notificação Comercial Instantânea (Brevo API)
- Assim que o lead é persistido com sucesso no banco, o serviço dispara um e-mail transacional via API REST da **Brevo** (`POST https://api.brevo.com/v3/smtp/email`) contendo os dados claros do lead para a equipe comercial agir em tempo hábil.

### 4. 🛡️ Defesa e Blindagem da Aplicação
- **CORS Estrito**: Bloqueio de origens externas não autorizadas, com liberação exclusiva para o portal oficial (`hadtelecom.net.br`).
- **Rate Limiting**: Mitigação contra ataques de força bruta e DoS.
- **Helmet**: Proteção avançada de cabeçalhos HTTP.
- **JWT (JSON Web Token)**: Proteção criptográfica nas rotas administrativas de consulta de leads.

---

## 🏛️ Arquitetura do Sistema

<p align="center">
  <img src="./Vis%C3%A3o%20Arquitetural%20Corporativa%20View.png" alt="Visão Arquitetural Corporativa HadTelecom" width="900" />
</p>

### Diagrama Esquemático de Fluxo

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                   ARQUITETURA - API HADTELECOM                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

   [ 👤 Cliente / Visitante ]                                                               [ 💼 Equipe Comercial HadTelecom ]
               │                                                                                            ▲
               ▼ (HTTPS / Navegação)                                                                        │ (Alerta de Lead por E-mail)
   ┌────────────────────────────────────────┐                                                               │
   │      Frontend React (HostGator)        │                                                               │
   │        hadtelecom.net.br               │                                                               │
   └────────────────────────────────────────┘                                                               │
               │                                                                                            │
               │ (POST /api/chat - JSON: history, message)                                                  │
               ▼                                                                                            │
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┐
│ API HADTELECOM (Node.js + Express + TypeScript)                                                           │                     │
│                                                                                                           │                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐  │                     │
│  │ 🛡️  CAMADA DE SEGURANÇA & MIDDLEWARES                                                                │  │                     │
│  │   • CORS restrito (hadtelecom.net.br)  • Helmet (Headers HTTP)  • Rate Limit (Proteção DDoS)        │  │                     │
│  │   • authenticateToken (Validação JWT para rotas restritas)                                          │  │                     │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘  │                     │
│               │                                              │                                            │                     │
│               ▼                                              ▼                                            │                     │
│  ┌─────────────────────────┐                   ┌─────────────────────────────┐                            │                     │
│  │     ChatController      │                   │       AuthController        │                            │                     │
│  │    (POST /api/chat)     │                   │  (POST /api/login)          │                            │                     │
│  │                         │                   │  (GET  /api/leads - JWT)    │                            │                     │
│  └─────────────────────────┘                   └─────────────────────────────┘                            │                     │
│               │                                                                                           │                     │
│               ▼                                                                                           │                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐  │                     │
│  │ ⚙️  CAMADA DE CASO DE USO: SendChatMessageUseCase                                                    │  │                     │
│  │   1. Envia histórico e mensagem para o serviço de IA                                                │  │                     │
│  │   2. Processa resposta e detecta delimitador <<<LEAD_DATA { ... } LEAD_DATA>>>                      │  │                     │
│  │   3. Se lead detectado: extrai JSON, limpa texto da resposta e salva no repositório                 │  │                     │
│  │   4. Retorna resposta limpa em linguagem natural para o usuário                                     │  │                     │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘  │                     │
│               │                                                      │                                    │                     │
│               │ (1. IA Completion)                                   │ (2. Salva Lead detectado)          │                     │
│               ▼                                                      ▼                                    │                     │
│  ┌────────────────────────────────────────┐            ┌───────────────────────────────────────────────┐  │                     │
│  │ 🔀 FallbackAgentAdapter                │            │ 🗄️ TursoLeadRepository                        │  │                     │
│  │    (IAIAgentService)                   │            │    (ILeadRepository)                          │  │                     │
│  │                                        │            │                                               │  │                     │
│  │   • Timeout Monitor: 10s (AI_TIMEOUT)  │            │   • Criptografa PII (AES-256-GCM)             │  │                     │
│  │   • Detecção de 429/503/Sobrecarga     │            │   • Executa INSERT seguro no Turso LibSQL     │  │                     │
│  │   • Cadeia sequencial de provedores    │            │   • Aciona notificação pós-persistência       │  │                     │
│  └────────────────────────────────────────┘            └───────────────────────────────────────────────┘  │                     │
│         │                         │                                          │                            │                     │
│         │ (1ª Tentativa)          │ (Fallback se 429/Timeout)                │ (Gatilha após salvar)      │                     │
│         ▼                         ▼                                          ▼                            │                     │
│  ┌───────────────┐         ┌───────────────┐           ┌───────────────────────────────────────────────┐  │                     │
│  │   GroqAgent   │         │  GoogleAgent  │           │ ✉️ BrevoNotificationService                   │  │                     │
│  │    Adapter    │         │    Adapter    │           │    (INotificationService)                     │  │                     │
│  │  (700 tokens) │         │  (700 tokens) │           │                                               │  │                     │
│  │  qwen/qwen    │         │  gemini-3.8   │           │   • POST /v3/smtp/email                       │  │                     │
│  │  3.8-27b      │         │  flash        │           │   • Envia dados do lead via API REST          │  │                     │
│  └───────────────┘         └───────────────┘           └───────────────────────────────────────────────┘  │                     │
│         │                         │                                          │                            │                     │
└─────────┼─────────────────────────┼──────────────────────────────────────────┼────────────────────────────┼─────────────────────┘
          │                         │                                          │                            │
          ▼                         ▼                                          ▼                            │
┌──────────────────┐      ┌──────────────────┐           ┌───────────────────────────┐      ┌─────────────────────────────────────┐
│ ☁️ GROQ CLOUD API │      │ ☁️ GOOGLE AI API  │           │ ☁️ TURSO CLOUD DATABASE   │      │ ☁️ BREVO TRANSACTIONAL EMAIL        │
│   (LLM Primária) │      │  (LLM Fallback)  │           │   (LibSQL / SQLite Cloud) │      │   (Disparo de e-mail transacional)  │
│                  │      │                  │           │   Região: AWS sa-east-1   │      │   Destino: ailson.costa@...         │
└──────────────────┘      └──────────────────┘           └───────────────────────────┘      └─────────────────────────────────────┘
```

---

## 📁 Estrutura de Pastas

```text
api-hadtelecom/
├── architecture.archimate          # Modelo arquitetural nativo Archi (v4/v5)
├── architecture_exchange.xml       # Modelo Open Group ArchiMate 3.1 Exchange
├── docs/
│   └── ARQUITETURA.md              # Documentação detalhada dos componentes arquiteturais
├── src/
│   ├── application/
│   │   └── use-cases/
│   │       ├── send-chat-message.use-case.ts       # Orquestração do chat e extração de leads
│   │       └── send-chat-message.use-case.test.ts  # Testes unitários do UseCase
│   ├── core/
│   │   ├── domain/
│   │   │   └── chat.entity.ts                      # Interfaces de domínio (ChatMessage, ChatResponse)
│   │   └── interfaces/
│   │       ├── ai-agent.interface.ts               # Contrato IAIAgentService
│   │       └── notification-service.interface.ts   # Contrato INotificationService
│   ├── infrastructure/
│   │   ├── ai/
│   │   │   ├── agent.config.ts                     # Prompts de sistema e regras de negócio da HadTelecom
│   │   │   ├── fallback-agent.adapter.ts           # Gerenciador de cadeia de fallback e timeout
│   │   │   ├── fallback-agent.adapter.test.ts      # Testes da cadeia de resiliência
│   │   │   ├── google-agent.adapter.ts             # Adaptador Google Gemini
│   │   │   ├── google-agent.adapter.test.ts        # Testes do adaptador Gemini
│   │   │   ├── groq-agent.adapter.ts               # Adaptador Groq Cloud (Qwen)
│   │   │   └── groq-agent.adapter.test.ts          # Testes do adaptador Groq
│   │   ├── database/
│   │   │   ├── turso-lead.repository.ts            # Repositório Turso LibSQL com criptografia
│   │   │   └── turso-lead.repository.test.ts       # Testes unitários do repositório
│   │   ├── http/
│   │   │   ├── controllers/
│   │   │   │   ├── auth.controller.ts              # Login administrativo e autenticação
│   │   │   │   ├── chat.controller.ts              # Endpoint público do chat
│   │   │   │   └── chat.controller.test.ts         # Testes do controller de chat
│   │   │   └── middlewares/
│   │   │       ├── auth.middleware.ts              # Validação de Bearer Token JWT
│   │   │       ├── security.middleware.ts          # CORS, Rate Limiter e Helmet
│   │   │       └── security.middleware.test.ts     # Testes das regras de segurança
│   │   ├── notifications/
│   │   │   ├── brevo-notification.service.ts       # Envio de e-mail transacional via API Brevo
│   │   │   └── brevo-notification.service.test.ts  # Testes do serviço de notificação
│   │   └── security/
│   │       ├── encryption.service.ts               # Criptografia simétrica AES-256-GCM
│   │       └── encryption.service.test.ts          # Testes de integridade e cifra
│   └── server.ts                                   # Ponto de entrada, injeção de dependências e rotas
├── package.json
├── tsconfig.json
└── .env
```

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Finalidade |
| :--- | :--- |
| **Node.js (v22+)** | Ambiente de execução JavaScript/TypeScript |
| **TypeScript (v5.x)** | Tipagem estática rigorosa (`strict: true`, `noUncheckedIndexedAccess`) |
| **Express (v5.x)** | Servidor HTTP de alta performance |
| **@libsql/client** | Driver cliente do banco distribuído Turso |
| **groq-sdk** | SDK oficial para inferência de alta velocidade na Groq Cloud |
| **@google/genai** | SDK oficial do Google Gemini |
| **node:crypto** | Módulo nativo para criptografia autenticada `AES-256-GCM` |
| **jsonwebtoken** | Emissão e validação de tokens JWT |
| **cors / helmet** | Blindagem e sanitização de cabeçalhos de segurança |
| **node:test / node:assert**| Suíte de testes nativa de altíssima velocidade |

---

## 🌐 Endpoints da API

### 1. Conversação do Chat (Público)
- **Método**: `POST`
- **Rota**: `/api/chat`
- **Headers**: `Content-Type: application/json`
- **Payload**:
  ```json
  {
    "message": "Olá! Gostaria de saber sobre o plano de internet dedicada para empresas.",
    "history": [
      { "role": "user", "content": "Boa tarde" },
      { "role": "model", "content": "Boa tarde! Como posso ajudar você hoje?" }
    ]
  }
  ```
- **Resposta de Sucesso (200 OK)**:
  ```json
  {
    "reply": "Olá! Temos soluções em links dedicados com garantia de 100% de banda e SLA de 4 horas. Para qual cidade ou bairro você precisa de atendimento?",
    "timestamp": "2026-10-02T22:00:00.000Z",
    "status": "enviado"
  }
  ```

### 2. Autenticação Administrativa
- **Método**: `POST`
- **Rota**: `/api/login`
- **Payload**:
  ```json
  {
    "username": "admin",
    "password": "123"
  }
  ```
- **Resposta**: Retorna token JWT para acesso às rotas restritas.

### 3. Listagem de Leads (Protegida por Token)
- **Método**: `GET`
- **Rota**: `/api/leads`
- **Headers**: `Authorization: Bearer <SEU_TOKEN_JWT>`
- **Resposta (200 OK)**: Retorna lista completa de leads com os dados descriptografados.

---

## ⚙️ Variáveis de Ambiente (`.env`)

Crie um arquivo `.env` na raiz do projeto com as seguintes chaves configuradas:

```env
# Configurações do Servidor
PORT=3001
NODE_ENV=production

# Provedor Google Gemini
GEMINI_MODEL=gemini-3.8-flash
GEMINI_API_KEY=sua_chave_gemini_aqui
GEMINI_MAX_TOKENS=700

# Provedor Groq Cloud
GROQ_MODEL=qwen/qwen3.8-27b
GROQ_API_KEY=sua_chave_groq_aqui
GROQ_MAX_TOKENS=700

# Monitor de Timeout da IA (em milissegundos)
AI_TIMEOUT_MS=10000

# Segurança e CORS
ALLOWED_ORIGIN=https://hadtelecom.net.br/
JWT_SECRET=sua_chave_secreta_jwt_hadtelecom_2026
ADMIN_USER=admin
ADMIN_PASS=sua_senha_admin

# Banco de Dados Turso (LibSQL)
DATABASE_URL=libsql://leads-seu-cluster.turso.io
DATABASE_TOKEN=seu_token_turso_aqui

# Criptografia de Dados dos Clientes (AES-256-GCM - chave de 256 bits em hex)
ENCRYPTION_KEY=c5bf178e451df8fb12b273aabb228dd66b9f8cc9dd55a66408f558a890719c18

# Notificações Comerciais via Brevo (Email Transacional)
BREVO_API_KEY=sua_chave_brevo_xkeysib_aqui
BREVO_SENDER_EMAIL=contato@hadtelecom.net.br
BREVO_NOTIFY_EMAIL_TO=ailsonlcosta@gmail.com
```

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- **Node.js**: v20.x ou superior (v22 recomendado).
- **Gerenciador de Pacotes**: `npm` ou `pnpm`.

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/hadtelecom/api-hadtelecom.git
cd api-hadtelecom
npm install
```

### 2. Executar em Modo de Desenvolvimento (Hot Reload)
```bash
npm run dev
```

### 3. Compilar e Executar em Produção
```bash
npm run build
npm start
```

### 4. Executar a Suíte de Testes Automatizados
```bash
npm test
```
> Executa todos os 57 testes unitários e de integração utilizando o test runner nativo do Node.js.

---

## 👨‍💻 Desenvolvedor & Manutenção

Este projeto é desenvolvido e mantido por:

* **Responsável Técnico**: Ailson Costa
* **Engenharia de Software**: HadTelecom
* **E-mail de Contato**: [ailsonlcosta@gmail.com](mailto:ailsonlcosta@gmail.com) | [ailson.costa@hadtelecom.net.br](mailto:ailson.costa@hadtelecom.net.br)
* **Portal Oficial**: [hadtelecom.net.br](https://hadtelecom.net.br)

---

## 📄 Licença

Propriedade intelectual de **HadTelecom**. Todos os direitos reservados.
