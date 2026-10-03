import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  const secretKey = 'minha_chave_de_teste_super_secreta_2026';
  const service = new EncryptionService(secretKey);

  it('deve criptografar e descriptografar um texto mantendo o valor original', () => {
    const originalText = 'João Silva - (11) 99999-8888 - joao@empresa.com.br';
    const encrypted = service.encrypt(originalText);

    assert.ok(encrypted.startsWith('enc:v1:'), 'Deve conter o prefixo de versão');
    assert.notStrictEqual(encrypted, originalText, 'O texto criptografado não deve ser igual ao original');

    const decrypted = service.decrypt(encrypted);
    assert.strictEqual(decrypted, originalText, 'O texto descriptografado deve ser exatamente igual ao original');
  });

  it('deve produzir cifras diferentes para a mesma entrada devido ao IV aleatório', () => {
    const text = '11999998888';
    const encrypted1 = service.encrypt(text);
    const encrypted2 = service.encrypt(text);

    assert.notStrictEqual(encrypted1, encrypted2, 'Cifras devem ser diferentes para proteger contra análise de frequência');
    assert.strictEqual(service.decrypt(encrypted1), text);
    assert.strictEqual(service.decrypt(encrypted2), text);
  });

  it('deve retornar o texto inalterado se for dado legado sem prefixo enc:v1:', () => {
    const legacyText = 'Cliente Antigo Sem Criptografia';
    const result = service.decrypt(legacyText);
    assert.strictEqual(result, legacyText);
  });

  it('deve lidar com valores vazios sem quebrar', () => {
    assert.strictEqual(service.encrypt(''), '');
    assert.strictEqual(service.decrypt(''), '');
  });

  it('não deve conseguir descriptografar com chave diferente e retornar texto sem quebrar aplicação', () => {
    const encrypted = service.encrypt('Dado Confidencial');

    const anotherService = new EncryptionService('outra_chave_completamente_diferente');
    const result = anotherService.decrypt(encrypted);

    // Quando a chave é incompatível, a autenticação GCM falha e o serviço retorna com segurança sem travar a aplicação
    assert.strictEqual(result, encrypted);
  });
});
