import { APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode } from 'axios';
import { CustomAxiosError } from '../types/error';

const { BadRequest } = HttpStatusCode;

export async function sleep(ms: number): Promise<void> {
  if (!ms) return;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ResponseOptions = {
  contentType?: string;
  corsOrigin?: string;
};

export function createResponse(
  statusCode = HttpStatusCode.Ok,
  data?: any,  // eslint-disable-line
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

export function parsePath(path: string, expectedPrefix?: string) {
  if (!path) return { pathParts: [] };
  if (path.startsWith('/')) path = path.slice(1);
  const pathParts = path.split('/');
  if (pathParts?.length && pathParts[0].match(/v\d+/)) { pathParts.shift() }
  if (expectedPrefix) {
    if (pathParts?.length && pathParts[0] !== expectedPrefix ) throw new CustomAxiosError(`Invalid path: ${path}, expected ${expectedPrefix}`, { status: BadRequest });
    if (pathParts?.length && pathParts[0] === expectedPrefix ) { pathParts.shift() };
  }
  const pathFirst = pathParts?.length ? pathParts[0] : undefined;
  return { pathParts, pathFirst };
}
