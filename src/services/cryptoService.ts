import {
  ECDH,
  constants,
  createCipheriv,
  createDecipheriv,
  createECDH,
  createHash,
  generateKeyPairSync,
  privateDecrypt,
  publicEncrypt,
  sign,
  verify,
} from "crypto";

const AES_ALGORITHM = 'aes-256-cbc'; //Using AES encryption
const { RSA_PKCS1_OAEP_PADDING, RSA_PKCS1_PSS_PADDING } = constants;

export type KeyPair = {
  publicKey: string;
  privateKey: string;
  ecdh?: ECDH;
}

export function hash(input: string): string {
  return createHash('sha3-256').update(input, 'utf8').digest('hex');
}

export function encryptAES(text: string, key: string, IV: string): string {
   let iv = Buffer.from(IV, 'hex');
   let cipher = createCipheriv(AES_ALGORITHM, Buffer.from(key, 'hex'), iv);
   let encrypted = cipher.update(text);
   encrypted = Buffer.concat([encrypted, cipher.final()]);
   return encrypted.toString('hex');
}

export function decryptAES(text: string, key: string, IV: string): string {
   let iv = Buffer.from(IV, 'hex');
   let encryptedText = Buffer.from(text, 'hex');
   let decipher = createDecipheriv(AES_ALGORITHM, Buffer.from(key, 'hex'), iv);
   let decrypted = decipher.update(encryptedText);
   decrypted = Buffer.concat([decrypted, decipher.final()]);
   return decrypted.toString('utf8');
}

export function createRSAKeyPair(keySizeInBits = 2048): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: keySizeInBits,
  });
  const publicKeyString = publicKey.export({
    type: "pkcs1",
    format: "pem",
  }).toString();
  const privateKeyString = privateKey.export({
    type: "pkcs8",
    format: "pem",
  }).toString();
  const result = { publicKey: publicKeyString, privateKey: privateKeyString };
  console.log(result);
  return result;
}

export function encryptRSA(publicKey: string, data: any): string {
  const result = publicEncrypt({
      key: publicKey,
      padding: RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha3-256",
    },
    Buffer.from(data)
  );
  console.debug("encrypted data: ", result.toString("base64"));
  return result.toString("base64");
}

export function decryptRSA(privateKey: string, b64EncryptedData: string): any {
  const result = privateDecrypt({
      key: privateKey,
      padding: RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha3-256",
    },
    Buffer.from(b64EncryptedData, 'base64'));
  return result.toString('utf8');
}

export function signRSA(privateKey: string, verifiableData: any) {
  const algorithm = 'sha3-256';
  const key = {
    key: privateKey,
    padding: RSA_PKCS1_PSS_PADDING,
  };
  const result = sign(algorithm, Buffer.from(verifiableData), key);
  console.log("signature: "+result.toString("base64"));
  return result.toString('hex');
}

export function verifyRSA(publicKey: string, verifiableData: any, signature: string) {
  const algorithm = 'sha3-256';
  const key = {
    key: publicKey,
    padding: RSA_PKCS1_PSS_PADDING,
  };
  const result = verify(algorithm, Buffer.from(verifiableData), key, Buffer.from(signature, 'hex'));
  return result;
}


export function createECDHKeyPair(): KeyPair {
  // console.debug("ECDH curves", getCurves());
  const ecdh = createECDH('secp256k1');
  ecdh.generateKeys();
  const publicKey = ecdh.getPublicKey().toString('hex');
  const privateKey = ecdh.getPrivateKey().toString('hex');
  return { ecdh, publicKey, privateKey };
}
