import { createECDH, randomBytes, verify } from "crypto";
import { createECDHKeyPair, createRSAKeyPair, decryptAES, decryptRSA, encryptAES, encryptRSA, hash, signRSA, verifyRSA } from "./cryptoService";

describe('hash', () => {
  it('simple', () => {
    expect(hash('a')).toEqual('80084bf2fba02475726feb2cab2d8215eab14bc6bdd8bfb2c8151257032ecd8b');
  });
});

describe('aes', () => {
  it('encrypt&decrypt with fixed keys', () => {
    const key = '274d565159e27bcea1ab9b3685f967cd54b4b1acf61339e1dd92345b24df6324'; // randomBytes(32).toString('hex');
    const iv = '85caadfdfb111e6866de47ae387835b0'; // randomBytes(16).toString('hex');
    const data = 'data';
    const encoded = encryptAES(data, key, iv);
    expect(encoded).toEqual('949adab588d330b9133658b85324d3ae');
    const decoded = decryptAES(encoded, key, iv);
    expect(decoded).toEqual(data);
  });
  it('encrypt&decrypt with random keys', () => {
    const key = randomBytes(32).toString('hex');
    const iv = randomBytes(16).toString('hex');
    const data = 'data';
    const encoded = encryptAES(data, key, iv);
    const decoded = decryptAES(encoded, key, iv);
    // console.debug({key, iv, data, encoded, decoded});
    expect(decoded).toEqual(data);
  });
});


describe('rsa', () => {
  it('encrypt&decrypt', () => {
    const { publicKey, privateKey } = createRSAKeyPair();
    const data = 'data';
    const encoded = encryptRSA(publicKey, data);
    const decoded = decryptRSA(privateKey, encoded);
    // console.debug({publicKey, privateKey, data, encoded, decoded});
    expect(decoded).toEqual(data);
  });
  it('sign&verify', () => {
    const { publicKey, privateKey } = createRSAKeyPair();
    const data = 'data';
    const signature = signRSA(privateKey, data);
    const verify = verifyRSA(publicKey, data, signature);
    // console.debug({publicKey, privateKey, data, signature, verify});
    expect(verify).toEqual(true);
  });
});

describe('ecdh', () => {
  it('encrypt&decrypt', () => {
    const { publicKey: alicePublic, privateKey: alicePrivate, ecdh: alice } = createECDHKeyPair();
    const { publicKey: bobPublic, privateKey: bobPrivate, ecdh: bob } = createECDHKeyPair();
    
    const aliceSharedKey = alice?.computeSecret(Buffer.from(bobPublic, 'hex')).toString('hex');
    const bobSharedKey = bob?.computeSecret(Buffer.from(alicePublic, 'hex')).toString('hex');

    // console.debug({ alicePrivate, alicePublic, bobPrivate, bobPublic, aliceSharedKey, bobSharedKey });
    expect(aliceSharedKey).toEqual(bobSharedKey);
  });
  it('computeSecret', () => {
    const { publicKey: alicePublic, ecdh: alice } = createECDHKeyPair();
    const { publicKey: bobPublic, privateKey: bobPrivate, ecdh: bob } = createECDHKeyPair();
    
    const sharedKeyFromAlice = alice?.computeSecret(Buffer.from(bobPublic, 'hex')).toString('hex');

    const echd = createECDH('secp256k1');
    echd.setPrivateKey(Buffer.from(bobPrivate, 'hex'));
    const computedSharedKey = echd.computeSecret(Buffer.from(alicePublic, 'hex')).toString('hex');
    
    // console.debug({ alicePublic, bobPrivate, bobPublic, sharedKeyFromAlice, computedSharedKey });
    expect(computedSharedKey).toEqual(sharedKeyFromAlice);

  });
});
