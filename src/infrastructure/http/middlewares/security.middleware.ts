import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const getIsDev = (): boolean => {
  return (
    process.env.NODE_ENV === 'development' ||
    process.argv.includes('--dev') ||
    process.env.NODE_ENV !== 'production'
  );
};

export const checkOriginAllowed = (
  origin: string | undefined,
  isDev: boolean,
  customAllowedOrigin?: string
): boolean => {
  // Permite requisições sem origin (como Postman, curl, mobile ou server-to-server)
  if (!origin) {
    return true;
  }

  const normalizedOrigin = origin.trim().replace(/\/+$/, '');

  if (isDev) {
    // Em desenvolvimento: aceita http://localhost:3000 (e localhost em geral)
    const isLocalhost =
      normalizedOrigin === 'http://localhost:3000' ||
      normalizedOrigin === 'http://127.0.0.1:3000' ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin);

    if (isLocalhost) {
      return true;
    }
  }

  // Em produção (ou caso contrário): aceita https://hadtelecom.net.br
  const productionOrigins = [
    'https://hadtelecom.net.br',
    'https://www.hadtelecom.net.br'
  ];

  if (customAllowedOrigin) {
    productionOrigins.push(customAllowedOrigin.trim().replace(/\/+$/, ''));
  }

  return productionOrigins.includes(normalizedOrigin);
};

export const securityMiddlewares = [
  helmet(),
  cors({
    origin: (origin, callback) => {
      const isDev = getIsDev();
      const allowedOrigin = process.env.ALLOWED_ORIGIN;

      if (checkOriginAllowed(origin, isDev, allowedOrigin)) {
        callback(null, true);
      } else {
        callback(new Error('Bloqueado pelas políticas de CORS.'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }),
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: getIsDev() ? 1000 : 60, // Limite relaxado em dev, 60 reqs por IP em produção
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições deste IP. Aguarde alguns minutos.' }
  })
];