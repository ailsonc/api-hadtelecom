import { IAIAgentService } from '../../core/interfaces/ai-agent.interface';
import { ChatMessage } from '../../core/domain/chat.entity';

export interface AIProviderConfig {
  name: string;
  provider: IAIAgentService;
  timeoutMs?: number;
}

export interface FallbackAgentOptions {
  defaultTimeoutMs?: number;
}

export class FallbackAgentAdapter implements IAIAgentService {
  private readonly providers: AIProviderConfig[];
  private readonly defaultTimeoutMs: number;

  constructor(
    providers: AIProviderConfig[] = [],
    options?: FallbackAgentOptions
  ) {
    if (!providers || providers.length === 0) {
      throw new Error('FallbackAgentAdapter precisa de pelo menos um provedor configurado.');
    }
    this.providers = [...providers];
    this.defaultTimeoutMs =
      options?.defaultTimeoutMs ??
      (process.env.AI_TIMEOUT_MS ? Number(process.env.AI_TIMEOUT_MS) : 10000);
  }

  /**
   * Permite adicionar novos provedores facilmente na cadeia de fallback
   */
  addProvider(config: AIProviderConfig): this {
    this.providers.push(config);
    return this;
  }

  getProviders(): readonly AIProviderConfig[] {
    return this.providers;
  }

  async generateResponse(history: ChatMessage[], prompt: string): Promise<string> {
    const errors: Array<{ provider: string; reason: string }> = [];

    for (let i = 0; i < this.providers.length; i++) {
      const currentProvider = this.providers[i];
      if (!currentProvider) continue;

      const { name, provider, timeoutMs } = currentProvider;
      const timeout = timeoutMs ?? this.defaultTimeoutMs;

      try {
        console.log(`[AI-Fallback] Tentando provedor ${i + 1}/${this.providers.length}: [${name}] (Timeout: ${timeout}ms)...`);

        const response = await this.executeWithTimeout<string>(
          () => provider.generateResponse(history, prompt),
          timeout,
          name
        );

        if (!response || response.trim() === '' || response.trim() === 'Sem resposta do modelo.') {
          throw new Error('Resposta vazia retornada pelo modelo.');
        }

        if (i > 0) {
          console.log(`[AI-Fallback] Resposta obtida com sucesso via provedor de fallback [${name}]!`);
        }

        return response;
      } catch (error: any) {
        const isTimeout = error?.name === 'TimeoutError' || error?.message?.includes('demorou mais');
        const isRateLimitOrOverload = this.isRateLimitOrOverload(error);

        let reason = error?.message || 'Erro desconhecido';
        if (isTimeout) {
          reason = `Demora excessiva (Timeout de ${timeout}ms excedido)`;
          console.warn(`[AI-Fallback] Provedor [${name}] demorou muito e foi interrompido.`);
        } else if (isRateLimitOrOverload) {
          reason = `Limite de requisições ou sobrecarga detectada (429/503/Quota): ${error?.message}`;
          console.warn(`[AI-Fallback] Limite ou sobrecarga detectada no provedor [${name}].`);
        } else {
          console.warn(`[AI-Fallback] Provedor [${name}] falhou com erro: ${error?.message}`);
        }

        errors.push({ provider: name, reason });

        const nextProvider = this.providers[i + 1];
        if (nextProvider) {
          console.warn(`[AI-Fallback] Alternando para o próximo provedor: [${nextProvider.name}]...`);
        }
      }
    }

    const failureSummary = errors.map((e) => `[${e.provider}]: ${e.reason}`).join(' | ');
    throw new Error(`Todos os provedores de IA falharam. Detalhes: ${failureSummary}`);
  }

  /**
   * Detecta se o erro decorre de Rate Limit (429), Sobrecarga do servidor (503/500/502/504) ou Quota esgotada
   */
  public isRateLimitOrOverload(error: any): boolean {
    const status =
      error?.status ||
      error?.statusCode ||
      error?.response?.status ||
      error?.error?.status;

    if (status === 429 || status === 503 || status === 500 || status === 502 || status === 504) {
      return true;
    }

    const msg = String(error?.message || '').toLowerCase();
    return (
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('rate limit') ||
      msg.includes('ratelimit') ||
      msg.includes('quota') ||
      msg.includes('resource exhausted') ||
      msg.includes('resource_exhausted') ||
      msg.includes('sobrecarga') ||
      msg.includes('overload') ||
      msg.includes('high demand') ||
      msg.includes('capacity') ||
      msg.includes('busy')
    );
  }

  private executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    providerName: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          const error: any = new Error(
            `Provedor [${providerName}] demorou mais que ${timeoutMs}ms para responder.`
          );
          error.name = 'TimeoutError';
          reject(error);
        }
      }, timeoutMs);

      fn()
        .then((result) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(result);
          }
        })
        .catch((err) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(err);
          }
        });
    });
  }
}
