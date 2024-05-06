import {
  APIGatewayAuthorizerResult,
  APIGatewayAuthorizerResultContext,
  APIGatewayRequestAuthorizerEvent,
  PolicyDocument,
} from 'aws-lambda';
import { JwtPayload } from 'jsonwebtoken';
import { extractToken, verifyToken } from '../services/authService';

type Effect = 'Allow' | 'Deny';

export async function handleEvent(event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> {
  const { path, methodArn, headers } = event;
  if (!path || path.startsWith('/auth') || path.startsWith('/v1/auth')) {
    return generatePolicy('', 'Allow', methodArn, {
      username: '',
    });
  }
  const authHeader = headers?.Authorization || headers?.authoization || '';
  const token = extractToken(authHeader, 'bearer');
  if (!token) {
    console.log('Authorization denied. Invalid Authorization header');
    return generatePolicy('', 'Deny', methodArn);
  }
  let tokenData: string | JwtPayload | undefined;
  try {
    tokenData = await verifyToken(token);
  } catch (e) {
    console.error('jwt token verification failed', e);
  }
  console.debug('tokenData', tokenData);
  if (typeof tokenData === 'string') {
    console.error(`Authorization denied. Token data is a string, expected a JWTPayload. ${tokenData}`);
    return generatePolicy('', 'Deny', methodArn);
  }
  const { sub: principalId, aud: tenantId, context } = tokenData || {};
  if (principalId) {
    console.log(`Authorization approved. principalId=${principalId}, tenantId=${tenantId}`);
    return generatePolicy(principalId, 'Allow', methodArn, {
      ...context,
      username: principalId,
      tenantId,
    });
  }
  console.log(`Authorization denied. principalId=${principalId}`);
  return generatePolicy('', 'Deny', methodArn, context);
}

// Helper function to generate an IAM policy
function generatePolicy(
  principalId: string,
  effect: Effect,
  resource: string | string[],
  context?: APIGatewayAuthorizerResultContext,
): APIGatewayAuthorizerResult {
  const authResponse = {} as APIGatewayAuthorizerResult;

  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument: PolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    };
    authResponse.policyDocument = policyDocument;
  }

  // Optional output with custom properties
  if (context) {
    authResponse.context = context;
  }
  console.debug({ principalId, effect, resource, context });
  return authResponse;
}
