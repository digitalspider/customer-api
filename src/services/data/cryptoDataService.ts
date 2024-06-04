import { User } from '../../types/auth';
import { decryptRSA, encryptRSA } from '../crypto/cryptoService';
import { Item } from '../dynamo/data';

export async function encryptItem(inputData: Item, user: User): Promise<Item> {
  const { publicKey, privateKey } = user || {};
  const { payload, ...restOfInput } = inputData || {};
  if (!publicKey || !privateKey || !payload) return inputData;
  const encPayload = await encryptRSA(publicKey, payload);
  return { ...restOfInput, encPayload };
}

export async function decryptItem(inputData: Item, user: User): Promise<Item> {
  const { publicKey, privateKey } = user || {};
  const { encPayload, ...restOfInput } = inputData || {};
  if (!publicKey || !privateKey || !encPayload) return inputData;
  const payload = await decryptRSA(privateKey, encPayload);
  return { ...restOfInput, payload };
}

export async function decryptList(inputData: Item[], user: User): Promise<Item[]> {
  const promises = inputData.map(item => decryptItem(item, user));
  return Promise.all(promises);
}
