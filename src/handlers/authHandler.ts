import { APIGatewayProxyEvent, APIGatewayProxyEventHeaders, APIGatewayProxyResult, Context } from 'aws-lambda';
import { HttpStatusCode } from 'axios';
import { HTTP_METHOD } from '../common/constants';
import {
  createJwt,
  extractToken,
  getItem,
  getJwtSecret,
  mapAuthToToken,
  verifyToken,
  createItem,
} from '../services/authService';
import { createResponse } from '../services/utils';
import { Auth, LoginInput } from '../types/auth';
import { CustomAxiosError } from '../types/error';

const { Ok, BadRequest, InternalServerError, MethodNotAllowed, Unauthorized } = HttpStatusCode;
const { GET, POST } = HTTP_METHOD;

export async function handleEvent(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  let response: APIGatewayProxyResult;
  const { httpMethod, path, headers, body: bodyString } = event;
  const { awsRequestId } = context;
  const body = bodyString ? JSON.parse(bodyString) : undefined;
  console.log('request', { handler: 'authHandler', httpMethod, path, awsRequestId });

  try {
    let data;
    const secret = await getJwtSecret();
    switch (httpMethod) {
      case GET:
        const jwtToken = extractTokenFromHeaders(headers, 'bearer');
        data = await verifyToken(jwtToken, secret);
        break;
      case POST:
        if (path.endsWith('/login')) {
          // const authData = await validateBasicAuth(event); // TODO: extra security
          const token = await handleCreateJwt(body as LoginInput, secret);
          data = { token };
        } else if (path.endsWith('/signup')) {
          // const authData = await validateBasicAuth(event); // TODO: extra security
          const user = await createItem(body as Auth);
          const token = await handleCreateJwt(user as LoginInput, secret);
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

async function handleCreateJwt(input: LoginInput, secret: string): Promise<string> {
  const { username: usernameInput, password: passwordInput } = input || {};
  const user = await getItem(usernameInput);
  const { username, password, tenantId, expiryInSec } = user || {};
  if (!user || passwordInput !== password) {
    throw new CustomAxiosError('Username or password is invalid', { status: Unauthorized });
  }
  if (!tenantId) {
    throw new CustomAxiosError(`The user ${username} has not been configured`, { status: InternalServerError });
  }
  const payload = mapAuthToToken(user);
  return createJwt(payload, secret, expiryInSec);
}

async function validateBasicAuth(event: APIGatewayProxyEvent): Promise<Auth> {
  const { httpMethod, path, requestContext, headers } = event;
  const { domainName } = requestContext;
  const token = extractTokenFromHeaders(headers, 'basic');
  const { username = getLocalhostTenant(domainName), jwtPass } = decodeToken(token);
  console.debug(`${httpMethod} ${path} ${username}`);
  if (!username) {
    throw new CustomAxiosError('Invalid Username', { status: Unauthorized });
  }
  const authData = await getItem(username);
  const { password, ...authDataWithoutPassword } = authData || { username };
  if (jwtPass !== password) {
    throw new CustomAxiosError('Invalid Basic Authentication parameters', { status: Unauthorized });
  }
  return authDataWithoutPassword;
}

function extractTokenFromHeaders(headers: APIGatewayProxyEventHeaders, expectedScheme?: string) {
  const authHeader = headers['authorization'] || headers['Authorization'];
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
