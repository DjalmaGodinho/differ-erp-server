import { generateKeyPairSync, publicEncrypt, privateDecrypt, createHash } from 'crypto';

let keyPair = null;

const cryptoService = {
  generateKeyPair() {
    if (keyPair) return keyPair;
    
    keyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    return keyPair;
  },

  getPublicKey() {
    const { publicKey } = this.generateKeyPair();
    return publicKey;
  },

  encrypt(data) {
    const { publicKey } = this.generateKeyPair();
    const buffer = Buffer.from(data, 'utf8');
    const encrypted = publicEncrypt(publicKey, buffer);
    return encrypted.toString('base64');
  },

  decrypt(encryptedData) {
    const { privateKey } = this.generateKeyPair();
    const buffer = Buffer.from(encryptedData, 'base64');
    const decrypted = privateDecrypt(privateKey, buffer);
    return decrypted.toString('utf8');
  },

  hashPassword(password) {
    return createHash('sha256').update(password).digest('hex');
  }
};

export default cryptoService;
