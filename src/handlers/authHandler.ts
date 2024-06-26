import { APIGatewayProxyEvent, APIGatewayProxyEventHeaders, APIGatewayProxyResult, Context } from 'aws-lambda';
import { HttpStatusCode } from 'axios';
import { JwtPayload } from 'jsonwebtoken';
import { HTTP_METHOD } from '../common/constants';
import { createItem, createJwt, extractToken, getItemByUsername, mapAuthToToken, verifyToken } from '../services/auth/authService';
import { createRSAKeyPair, hash } from '../services/crypto/cryptoService';
import { updateItem } from '../services/dynamo/auth';
import { createResponse, parsePath } from '../services/utils/utils';
import { Auth, LoginInput } from '../types/auth';
import { CustomAxiosError } from '../types/error';

const { Ok, BadRequest, InternalServerError, MethodNotAllowed, Unauthorized } = HttpStatusCode;
const { GET, POST } = HTTP_METHOD;

export async function handleEvent(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  let response: APIGatewayProxyResult;
  const { httpMethod, path, headers, body: bodyString, queryStringParameters } = event;
  const { awsRequestId } = context;
  const body = bodyString ? JSON.parse(bodyString) : undefined;
  const { pathParts, pathFirst } = parsePath(path, 'auth');
  console.debug('request', {
    handler: 'authHandler',
    httpMethod,
    path,
    awsRequestId,
    headers,
    pathFirst,
    pathParts,
    body,
  });

  try {
    let data;
    switch (httpMethod) {
      case GET:
        const jwtToken = extractTokenFromHeaders(headers, 'bearer');
        data = await verifyToken(jwtToken);
        break;
      case POST:
        if (pathParts.length<=1) throw new CustomAxiosError(`Invalid path ${path}. Required additional path context`, { status: BadRequest })
        switch(pathParts[1]) {
          case 'login': {
            const { username, password, expiryInSec } = body as Auth;
            const { password: ignore, ...safeBody } = body;
            if (!username) throw new CustomAxiosError('Failed to login. Missing parameter: username', { status: BadRequest, data: { safeBody } });
            if (!password) throw new CustomAxiosError('Failed to login. Missing parameter: password', { status: BadRequest, data: { safeBody } });
            const token = await handleCreateJwt({ username, password, expiryInSec } as LoginInput);
            data = { token };
            break;
          }
          case 'signup': {
            const { username, password, expiryInSec: expiryInSecInput } = body as Auth;
            const { password: ignore, ...safeBody } = body;
            if (!username) throw new CustomAxiosError('Failed to signup. Missing parameter: username', { status: BadRequest, data: { safeBody } });
            if (!password) throw new CustomAxiosError('Failed to signup. Missing parameter: password', { status: BadRequest, data: { safeBody } });
            const existingUser = await getItemByUsername(username);
            if (existingUser) throw new CustomAxiosError('Failed to signup. User already exists', { status: BadRequest, data: { username } });
            const expiryInSec = expiryInSecInput && !isNaN(expiryInSecInput) ? Math.max(1, Math.min(24*3600, expiryInSecInput)) : undefined;
            const { publicKey, privateKey } = createRSAKeyPair();
            const userData: Partial<Auth> = { ...safeBody, username, password, expiryInSec, publicKey, privateKey };
            const user = await createItem(userData);
            if (!user) throw new CustomAxiosError('Failed to create new user', { status: BadRequest, data: { username } });
            const token = await handleCreateJwt({ username, password, expiryInSec } as LoginInput);
            data = { token };
            break;
          }
          case 'forgot-password': {
            const { username } = body;
            if (!username) throw new CustomAxiosError('Error. Missing parameter: username', { status: BadRequest });
            const user = await getItemByUsername(username);
            if (!user) throw new CustomAxiosError('Error. User does not exist', { status: BadRequest, data: { username } });
            const { userId } = user;
            const token = await createJwt({ username, userId }, '', 20*60);
            const resetPath = `${event.path}/password/reset?token=${token}`;
            data = { resetPath };
            break;
          }
          case 'reset-password': {
            const { newPass } = body;
            if (!newPass) throw new CustomAxiosError('Failed to reset password. Missing parameter: newPass', { status: BadRequest });
            const { token } = queryStringParameters || {};
            if (!token) throw new CustomAxiosError('Failed to reset password. Missing parameter: token', { status: BadRequest });
            const { username, userId } = (await verifyToken(token) || {}) as JwtPayload;
            if (!username) throw new CustomAxiosError('Failed to reset password. Invalid token', { status: BadRequest });
            await updateItem({ userId, username, password: hash(newPass) });
            console.debug(`Update new password for user ${username}`);
            const newJwt = await handleCreateJwt({ username, password: newPass } as LoginInput);
            data = { token: newJwt };
            break;
          }
          default:
            throw new CustomAxiosError(`Invalid path: ${path}`, { status: BadRequest });
        }
        break;
      default:
        throw new CustomAxiosError(`${httpMethod} ${path} is not a valid endpoint`, { status: MethodNotAllowed });
    }
    if (!data) {
      throw new CustomAxiosError(`${httpMethod} ${path} invalid request`, { status: BadRequest });
    }
    response = createResponse(Ok, data);
  } catch (error) {
    const { status, message, data = {}, url = `${httpMethod} ${path}` } = error as CustomAxiosError;
    console.error('Auth API - Unexpected error', { message, data, url, error });

    data.requestId = context.awsRequestId;
    response = createResponse(status || InternalServerError, {
      message,
      data,
      url,
    });
  }

  return response;
}

async function handleCreateJwt(input: LoginInput): Promise<string> {
  const { username, password: passwordInput, expiryInSec: expiryInSecInput } = input || {};
  const user = username ? (await getItemByUsername(username)) : undefined;
  const { password, ...safeUser } = user || {};
  console.debug('got user', { user: safeUser });
  const { expiryInSec: expiryInSecFromUser } = user || {};
  if (!user || hash(passwordInput) !== password) {
    throw new CustomAxiosError('Username or password is invalid', { status: Unauthorized });
  }
  const expiryInSecIn = expiryInSecInput && !isNaN(expiryInSecInput) ? Math.max(1, Math.min(24*3600, expiryInSecInput)) : undefined;
  const expiryInSec = expiryInSecIn || expiryInSecFromUser;
  const payload = mapAuthToToken({ ...user, expiryInSec });
  
  return createJwt(payload, undefined, expiryInSec);
}

function extractTokenFromHeaders(headers: APIGatewayProxyEventHeaders, expectedScheme?: string) {
  const authHeader = headers ? headers['authorization'] || headers['Authorization'] : undefined;
  if (!authHeader) {
    throw new CustomAxiosError('Invalid JWT token', { status: Unauthorized });
  }
  return extractToken(authHeader, expectedScheme);
}

function decodeToken(token: string) {
  const decoded = Buffer.from(token, 'base64').toString();
  const [username, jwtPass] = decoded.split(':');
  return { username, jwtPass };
}

function getLocalhostTenant(domainName?: string): string | undefined {
  if (domainName && domainName.toLowerCase().trim().startsWith('localhost')) {
    return 'localhost';
  }
}
