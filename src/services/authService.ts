import jwt, { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AUTH_ENDPOINT, SECRET_MANAGER_NAME } from '../common/config';
import { Auth } from '../types/auth';
import * as dynamo from './dynamo/auth';
import { getSecret } from './aws/secretService';
import { JWT_SECRET_NAME } from '../common/constants';

export function mapAuthToToken(authData: Auth): JwtPayload {
  const { username, tenantId, context } = authData;
  return {
    sub: username,
    aud: tenantId,
    context,
  };
}

export function extractToken(authorizationToken: string, expectedScheme = 'bearer') {
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
  const jwtSecret = secret || (await getJwtSecret());
  const iat = Math.floor(Date.now() / 1000) - 30; // 30 seconds ago
  const expiresIn = expiryInSec || 4 * 60 * 60; // Default is 4h
  const payload: JwtPayload = {
    iat,
    ...data,
    iss: AUTH_ENDPOINT,
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
    issuer: AUTH_ENDPOINT,
    algorithms: ['HS256'],
  };
  return jwt.verify(token, jwtSecret, verificationOptions);
}

export async function listItems(): Promise<Auth[]> {
  return dynamo.listItems();
}

export async function getItem(username: string): Promise<Auth> {
  const item = { username };
  return dynamo.getItem(item);
}

export async function createItem(auth: Auth): Promise<Auth> {
  const { username = uuidv4(), password = uuidv4(), tenantId = 'default', expiryInSec = 3600, ...userData } = auth;
  const item = { username, password, tenantId, expiryInSec, ...userData };
  return dynamo.createItem(item);
}

export async function updateItem(username: string, auth: Auth): Promise<Auth> {
  const item = { username, ...cleanInput(auth) };
  return dynamo.updateItem(item);
}

export async function deleteItem(username: string): Promise<void> {
  const item = { username };
  return dynamo.deleteItem(item);
}

function cleanInput(input: Auth): Omit<Auth, 'username'> {
  const { expiryInSec, tenantId } = input;
  return { expiryInSec, tenantId };
}
