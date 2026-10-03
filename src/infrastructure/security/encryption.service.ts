import crypto from 'node:crypto';

export class EncryptionService {
  private readonly key: Buffer;

  constructor(secretKey?: string) {
    const rawSecret =
      secretKey ||
      process.env.ENCRYPTION_KEY ||
      'hadtelecom_default_secret_encryption_key_2026';

    // Deriva uma chave criptográfica forte de 32 bytes (256 bits) usando SHA-256
    this.key = crypto.createHash('sha256').update(rawSecret).digest();
  }

  /**
   * Criptografa um texto usando AES-256-GCM com IV aleatório de 12 bytes.
   * Retorna no formato seguro: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
   */
  encrypt(text: string): string {
    if (!text) return text;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `enc:v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Descriptografa um texto formatado em enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>.
   * Se o texto for legado ou não estiver criptografado, retorna o texto original com segurança.
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText || typeof encryptedText !== 'string') {
      return encryptedText;
    }

    // Se não tiver o prefixo de versão, trata-se de dado legado não criptografado
    if (!encryptedText.startsWith('enc:v1:')) {
      return encryptedText;
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 5) {
      return encryptedText;
    }

    const ivHex = parts[2];
    const authTagHex = parts[3];
    const cipherHex = parts[4];

    if (!ivHex || !authTagHex || !cipherHex) {
      return encryptedText;
    }

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('[EncryptionService] Erro ao descriptografar campo:', error);
      return encryptedText;
    }
  }
}
