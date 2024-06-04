import { APIGatewayRequestAuthorizerEvent } from "aws-lambda";
import { extractToken, verifyToken } from '../services/auth/authService';
import { handleEvent, updateResourceForCaching } from "./authorize";

jest.mock('../services/aws/secretService');
// jest.mock('../services/authService');
const extractTokenMock = jest.fn(extractToken);
const verifyTokenMock = jest.fn(verifyToken);

beforeAll(() => {
  console.log = jest.fn;
  console.debug = jest.fn;
  console.error = jest.fn;
  console.info = jest.fn;
});

describe('authorize.ts', () => {
  it('updateResourceForCaching()', () => {
    const input = 'arn:aws:execute-api:ap-southeast-2:12345678:kej123asd/v1/GET/customer/123abc456';
    expect(updateResourceForCaching(input)).toEqual('arn:aws:execute-api:ap-southeast-2:12345678:kej123asd/*/*');
  });
  it('handleEvent()', async () => {
    const token = 'eyJhbGciOiJIUzI1NiIs...Zo24CtTtRzE_cWsxJ2P-UsWUKSjU';
    extractTokenMock.mockReturnValue(token);
    verifyTokenMock.mockResolvedValue({ sub: '123', aud: 'def' });
    const event: APIGatewayRequestAuthorizerEvent = {
      type: 'REQUEST',
      resource: 'x',
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      queryStringParameters: {},
      stageVariables: {},
      requestContext: {} as any,
      httpMethod: 'POST',
      path: '/v1/customer',
      pathParameters: {},
      methodArn: 'arn:aws:execute-api:ap-southeast-2:12345678:kej123asd/v1/POST/customer',
      headers: {
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br',
        authorization: `Bearer ${token}`,
        'content-length': '187',
        'content-type': 'application/json',
        host: 'api-staging.3keys.dev',
        'Postman-Token': '3f65a485-9f15-47ef-8f9d-7c60cb0615d8',
        'user-agent': 'PostmanRuntime/7.26.5',
        'X-Amzn-Trace-Id': 'Root=1-6644c8e3-039631993e8c33a604caa714',
        'X-Forwarded-For': '111.222.333.444',
        'X-Forwarded-Port': '443',
        'X-Forwarded-Proto': 'https'
      },
    };
    expect(await handleEvent(event)).toEqual({
      policyDocument: {
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Deny",
            Resource: "arn:aws:execute-api:ap-southeast-2:12345678:kej123asd/*/*",
          },
        ],
        Version: "2012-10-17",
      },
      principalId: "",
    });
  });
});