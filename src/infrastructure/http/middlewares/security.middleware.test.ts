import { describe, it } from 'node:test';
import assert from 'node:assert';
import { checkOriginAllowed, getIsDev } from './security.middleware';

describe('CORS checkOriginAllowed', () => {
  describe('Modo Desenvolvimento (isDev = true)', () => {
    it('deve permitir http://localhost:3000', () => {
      assert.strictEqual(checkOriginAllowed('http://localhost:3000', true), true);
    });

    it('deve permitir http://localhost:3000 com barra final', () => {
      assert.strictEqual(checkOriginAllowed('http://localhost:3000/', true), true);
    });

    it('deve permitir http://127.0.0.1:3000', () => {
      assert.strictEqual(checkOriginAllowed('http://127.0.0.1:3000', true), true);
    });

    it('deve permitir outra porta de desenvolvimento como http://localhost:5173', () => {
      assert.strictEqual(checkOriginAllowed('http://localhost:5173', true), true);
    });

    it('deve bloquear domínio externo não autorizado em dev', () => {
      assert.strictEqual(checkOriginAllowed('https://origem-desconhecida.com', true), false);
    });
  });

  describe('Modo Produção (isDev = false)', () => {
    it('deve bloquear http://localhost:3000 em produção', () => {
      assert.strictEqual(checkOriginAllowed('http://localhost:3000', false), false);
    });

    it('deve permitir https://hadtelecom.net.br', () => {
      assert.strictEqual(checkOriginAllowed('https://hadtelecom.net.br', false), true);
    });

    it('deve permitir https://hadtelecom.net.br com barra final', () => {
      assert.strictEqual(checkOriginAllowed('https://hadtelecom.net.br/', false), true);
    });

    it('deve permitir https://www.hadtelecom.net.br', () => {
      assert.strictEqual(checkOriginAllowed('https://www.hadtelecom.net.br', false), true);
    });

    it('deve permitir domínio vindo de ALLOWED_ORIGIN customizado', () => {
      assert.strictEqual(
        checkOriginAllowed('https://custom.hadtelecom.net.br', false, 'https://custom.hadtelecom.net.br/'),
        true
      );
    });

    it('deve bloquear domínio externo malicioso em produção', () => {
      assert.strictEqual(checkOriginAllowed('https://hacker.com', false), false);
    });

    it('deve bloquear tentativas de spoofing de domínio (prefixo ou sufixo malicioso)', () => {
      assert.strictEqual(checkOriginAllowed('https://hadtelecom.net.br.attacker.com', false), false);
      assert.strictEqual(checkOriginAllowed('https://fake-hadtelecom.net.br', false), false);
      assert.strictEqual(checkOriginAllowed('https://not-hadtelecom.net.br', false), false);
    });
  });

  describe('Requisições sem header Origin (Postman, mobile, curl)', () => {
    it('deve permitir quando origin for indefinido em dev', () => {
      assert.strictEqual(checkOriginAllowed(undefined, true), true);
    });

    it('deve permitir quando origin for indefinido em produção', () => {
      assert.strictEqual(checkOriginAllowed(undefined, false), true);
    });
  });
});

describe('getIsDev helper', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalArgv = [...process.argv];

  it('deve retornar false quando NODE_ENV for production e sem flag --dev', () => {
    process.env.NODE_ENV = 'production';
    process.argv = process.argv.filter((arg) => arg !== '--dev');
    try {
      assert.strictEqual(getIsDev(), false);
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.argv = [...originalArgv];
    }
  });

  it('deve retornar true quando NODE_ENV for development', () => {
    process.env.NODE_ENV = 'development';
    try {
      assert.strictEqual(getIsDev(), true);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('deve retornar true se a flag --dev estiver nos argumentos mesmo com NODE_ENV de produção', () => {
    process.env.NODE_ENV = 'production';
    process.argv.push('--dev');
    try {
      assert.strictEqual(getIsDev(), true);
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.argv = [...originalArgv];
    }
  });
});
