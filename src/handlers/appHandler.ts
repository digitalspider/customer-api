import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { HttpStatusCode } from 'axios';
import { HTTP_METHOD } from '../common/constants';
import { createCustomer, getCustomer, listCustomers } from '../services/customerService';
import { createResponse } from '../services/utils';
import { Customer } from '../types/customer';
import { CustomAxiosError } from '../types/error';

const { Ok, MethodNotAllowed, InternalServerError, BadRequest } = HttpStatusCode;
const { GET, POST } = HTTP_METHOD;

export async function handleEvent(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const { httpMethod, path, body: bodyString, requestContext, pathParameters } = event;
  const { awsRequestId } = context;
  const { authorizer } = requestContext || {};
  const { tenantId, username, userId } = authorizer || {};
  const { uuid: objectId } = pathParameters || {};
  const body = bodyString ? JSON.parse(bodyString) : undefined;
  console.debug('request', {
    handler: 'appHandler',
    httpMethod,
    path,
    awsRequestId,
    tenantId,
    objectId,
    username,
    userId,
    body,
  });

  try {
    let result;
    switch (httpMethod) {
      case GET:
        if (path.endsWith('/customer')) {
          result = await handleList(tenantId);
        } else {
          if (!objectId) throw new CustomAxiosError('Cannot get customer without a customerId', { status: BadRequest });
          result = await handleGet(tenantId, objectId, userId);
        }
        break;
      case POST:
        if (path.endsWith('/')) {
          result = await handleCreate({ ...body, tenantId, createdBy: userId }  as Customer);
        }
        break;
      default:
        throw new CustomAxiosError('Invalid request', { status: MethodNotAllowed });
    }

    console.debug('response', { httpMethod, path, awsRequestId, response: JSON.stringify(result) });
    return createResponse(Ok, result);
  } catch (err) {
    const { status, message, data, url = `${httpMethod} ${path}` } = (err as CustomAxiosError) || {};
    const errorStatus = status || InternalServerError;
    console.error(`ERROR in API Request ${httpMethod} ${path}.`, {
      message,
      httpMethod,
      path,
      awsRequestId,
      data,
      url,
      errorStatus,
      tenantId,
      objectId,
      body,
      err,
    });
    const errorBody = {
      message,
      status,
      awsRequestId,
    };
    return createResponse(errorStatus, errorBody);
  }
}

export async function handleList(tenantId: string): Promise<Customer[]> {
  const result = await listCustomers(tenantId);
  return result || [];
}

export async function handleGet(tenantId: string, objectId: string, userId: string): Promise<Customer> {
  const result = await getCustomer(tenantId, objectId);
  return result || {};
}

export async function handleCreate(customer: Customer): Promise<Customer> {
  const result = await createCustomer(customer);
  return result || {};
}
