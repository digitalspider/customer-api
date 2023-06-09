import { APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode } from 'axios';

export async function sleep(ms: number): Promise<void> {
  if (!ms) return;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ResponseOptions = {
  contentType?: string;
  corsOrigin?: string;
};

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createResponse(
  statusCode = HttpStatusCode.Ok,
  data?: any,
  options?: ResponseOptions,
): APIGatewayProxyResult {
  const { contentType = 'application/json', corsOrigin = '*' } = options || {};
  const response: APIGatewayProxyResult = {
    statusCode,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': corsOrigin,
    },
    body: typeof data === 'object' ? JSON.stringify(data) : data || '',
  };
  return response;
}

export type PromiseResults<T> = {
  errors: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  successes: T[];
};

export function groupSettledPromises<T>(response: PromiseSettledResult<T>[]): PromiseResults<T> {
  const errors = response.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => r.reason);
  const successes = response
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map((r) => r.value);
  return {
    errors,
    successes,
  };
}
