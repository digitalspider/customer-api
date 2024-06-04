import { User } from '../../types/auth';
import { decryptRSA, encryptRSA } from '../crypto/cryptoService';
import { Item } from '../dynamo/data';

export async function encryptItem(inputData: Item, user: User): Promise<Item> {
  const { publicKey, privateKey } = user || {};
  const { payload, ...restOfInput } = inputData || {};
  if (!publicKey || !privateKey || !payload) return inputData;
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const encPayload = await encryptRSA(publicKey, payloadString);
  return { ...restOfInput, encPayload };
}

export async function decryptItem(inputData: Item, user: User): Promise<Item> {
  const { publicKey, privateKey } = user || {};
  const { encPayload, ...restOfInput } = inputData || {};
  if (!publicKey || !privateKey || !encPayload) return inputData;
  const payloadString = await decryptRSA(privateKey, encPayload);
  const payload = JSON.parse(payloadString);
  return { ...restOfInput, payload };
}

export async function decryptList(inputData: Item[], user: User): Promise<Item[]> {
  const promises = inputData.map(item => decryptItem(item, user));
  return Promise.all(promises);
}
