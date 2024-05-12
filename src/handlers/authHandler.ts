import { APIGatewayProxyEvent, APIGatewayProxyEventHeaders, APIGatewayProxyResult, Context } from 'aws-lambda';
import { HttpStatusCode } from 'axios';
import { createHash } from 'node:crypto';
import { HTTP_METHOD } from '../common/constants';
import { createItem, createJwt, extractToken, getItem, getItemByUsername, mapAuthToToken, verifyToken } from '../services/authService';
import { createCustomer } from '../services/customerService';
import { createResponse } from '../services/utils';
import { Auth, LoginInput } from '../types/auth';
import { Customer } from '../types/customer';
import { CustomAxiosError } from '../types/error';

const { Ok, BadRequest, InternalServerError, MethodNotAllowed, Unauthorized } = HttpStatusCode;
const { GET, POST } = HTTP_METHOD;

export async function handleEvent(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  let response: APIGatewayProxyResult;
  const { httpMethod, path, headers, body: bodyString } = event;
  const { awsRequestId } = context;
  const body = bodyString ? JSON.parse(bodyString) : undefined;
  console.debug('request', {
    handler: 'authHandler',
    httpMethod,
    path,
    awsRequestId,
    headers,
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
        if (path.endsWith('/login')) {
          const token = await handleCreateJwt(body as LoginInput);
          data = { token };
        } else if (path.endsWith('/signup')) {
          const { tenantId, username } = body;
          const existingUser = username ? (await getItemByUsername(username)) : undefined;
          if (existingUser) throw new CustomAxiosError('User already exists', { status: BadRequest, data: { username } });
          body.password = hash(body.password);
          const userId = '';
          const userData: Auth = { tenantId, userId, password: body.password, username };
          const user = await createItem(userData);
          if (!user) throw new CustomAxiosError('Failed to create new user', { status: BadRequest, data: { username } });
          if (!user.tenantId) throw new CustomAxiosError('Failed to set tenantId for user', { status: BadRequest, data: { username } });
          const { password, ...safeBody } = body; // remove password from body
          const customer = await createCustomer({ tenantId, ...safeBody } as Customer);
          if (!customer) throw new CustomAxiosError('Failed to create new customer', { status: BadRequest, data: { username } });
          if (!customer.id) throw new CustomAxiosError('Failed to get customerId', { status: BadRequest, data: { username, customer } });
          const token = await handleCreateJwt({ username, password } as LoginInput);
          data = { token };
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
  const { username: usernameInput, password: passwordInput } = input || {};
  const userId = usernameInput; // TODO: How do I do this?
  const user = await getItem(userId);
  console.debug('got user', { user });
  const { password, tenantId, expiryInSec } = user || {};
  if (!user || hash(passwordInput) !== password) {
    throw new CustomAxiosError('Username or password is invalid', { status: Unauthorized });
  }
  if (!tenantId) {
    throw new CustomAxiosError(`The user ${userId} has not been configured`, { status: InternalServerError });
  }
  const payload = mapAuthToToken(user);
  return createJwt(payload, undefined, expiryInSec);
}

function hash(input: string) {
  return createHash('sha3-256').update(input, 'utf8').digest('hex');
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
