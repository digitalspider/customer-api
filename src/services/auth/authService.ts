import jwt, { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { SECRET_MANAGER_NAME, URL_AUTH } from '../../common/config';
import { JWT_SECRET_NAME } from '../../common/constants';
import { Auth } from '../../types/auth';
import { getSecret } from '../aws/secretService';
import { hash } from '../crypto/cryptoService';
import * as dynamo from '../dynamo/auth';

export function mapAuthToToken(authData: Auth): JwtPayload {
  const { userId, tenantId, context } = authData;
  return {
    sub: userId,
    aud: tenantId,
    context,
  };
}

export function extractToken(authorizationToken: string, expectedScheme = 'bearer'): string {
  if (!authorizationToken) return authorizationToken;
  const [scheme, token] = authorizationToken.split(' ');
  return scheme?.toLowerCase() === expectedScheme.toLowerCase() ? token : authorizationToken;
}

export async function getJwtSecret(): Promise<string> {
  const secrets = await getSecret(SECRET_MANAGER_NAME);
  const jwtSecret = (secrets || {})[JWT_SECRET_NAME];
  if (!jwtSecret) {
    throw new Error(`The secret ${JWT_SECRET_NAME} has not been configured`);
  }
  return jwtSecret;
}

export async function createJwt(data: JwtPayload, secret?: string, expiryInSec?: number): Promise<string> {
  if (!data) return '';
  console.debug('getting secret');
  const jwtSecret = secret || (await getJwtSecret());
  console.debug('got secret');
  const iat = Math.floor(Date.now() / 1000) - 30; // 30 seconds ago
  const expiresIn = expiryInSec || 4 * 60 * 60; // Default is 4h
  const payload: JwtPayload = {
    iat,
    ...data,
    iss: URL_AUTH,
  };

  const encryptionOptions: SignOptions = {
    algorithm: 'HS256',
    expiresIn,
  };
  return jwt.sign(payload, jwtSecret, encryptionOptions);
}

export async function verifyToken(token: string, secret?: string): Promise<string | JwtPayload | undefined> {
  if (!token) return;
  const jwtSecret = secret || (await getJwtSecret());
  const verificationOptions: VerifyOptions = {
    issuer: URL_AUTH,
    algorithms: ['HS256'],
  };
  return jwt.verify(token, jwtSecret, verificationOptions);
}

export async function listItems(): Promise<Auth[]> {
  return dynamo.listItems();
}

export async function getItem(userId: string): Promise<Auth> {
  const item = { userId };
  return dynamo.getItem(item);
}

export async function getItemByUsername(username: string): Promise<Auth|undefined> {
  const indexName = 'username-index'
  const KeyConditionExpression = 'username = :username';
  const ExpressionAttributeValues = { ':username': username };
  const users = await dynamo.queryIndex(indexName, KeyConditionExpression, ExpressionAttributeValues);
  return users?.length ? users[0] : undefined;
}

export async function createItem(auth: Partial<Auth>): Promise<Auth> {
  const { userId = uuidv4(), password = uuidv4(), ...userData } = auth;
  const item = { userId, password: hash(password), ...cleanInput(userData) };
  console.debug('creating item: '+JSON.stringify(item));
  return dynamo.createItem(item);
}

export async function updateItem(userId: string, auth: Partial<Auth>): Promise<Auth> {
  const { password } = auth;
  const item = { userId, password: password && hash(password), ...cleanInput(auth) };
  return dynamo.updateItem(item);
}

export async function deleteItem(userId: string): Promise<void> {
  const item = { userId };
  return dynamo.deleteItem(item);
}

function cleanInput(input: Partial<Auth>): Partial<Auth> {
  const { userId, password, ...safeInput } = input;
  return safeInput;
}
