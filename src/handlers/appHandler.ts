import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { HttpStatusCode } from 'axios';
import { AWSENV } from '../common/config';
import { HTTP_METHOD } from '../common/constants';
import { createData, deleteData, getData, listData, updateData } from '../services/dataService';
import { createResponse, parsePath } from '../services/utils';
import { User } from '../types/auth';
import { Customer } from '../types/customer';
import { CustomAxiosError } from '../types/error';

const { Ok, MethodNotAllowed, InternalServerError, BadRequest, NotFound } = HttpStatusCode;
const { GET, POST, PUT, DELETE } = HTTP_METHOD;

export async function handleEvent(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const { httpMethod, path, body: bodyString, requestContext, pathParameters } = event;
  const { awsRequestId } = context;
  const { authorizer } = requestContext || {};
  const { tenantId, username, userId, claims } = authorizer || {};
  const user: User = { tenantId, username, userId, claims };
  const { uuid: objectId } = pathParameters || {};
  const body = bodyString ? JSON.parse(bodyString) : undefined;
  const { pathParts, pathFirst = '' } = parsePath(path);
  const tableName = getTableName(pathFirst, tenantId);
  console.debug('request', {
    handler: 'appHandler',
    httpMethod,
    path,
    awsRequestId,
    user,
    objectId,
    tableName,
    pathParts,
    pathFirst,
    body,
  });

  try {
    let result;
    switch (httpMethod) {
      case GET:
        if (path.endsWith(`/${tableName}`)) {
          result = await handleList(tableName, user);
        } else {
          if (!objectId) throw new CustomAxiosError(`Failed to get item: ${tableName}. Missing parameter: id`, { status: BadRequest });
          result = await handleGet(tableName, objectId, user);
        }
        break;
      case POST:
        if (path.endsWith(`/${tableName}`)) {
          result = await handleCreate(tableName, body as Customer, user);
        }
        break;
      case PUT:
        if (!objectId) throw new CustomAxiosError(`Failed to update item: ${tableName}. Missing parameter: id`, { status: BadRequest });
        result = await handleUpdate(tableName, { ...body, id: objectId } as Partial<Customer>, user);
        break;
      case DELETE:
        if (!objectId) throw new CustomAxiosError(`Failed to delete item: ${tableName}. Missing parameter: id`, { status: BadRequest });
        result = await handleDelete(tableName, objectId, user);
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

function getTableName(tableName: string, tenantId?: string): string {
  return tenantId && tableName ? `${tenantId}-${tableName}-${AWSENV}` : tableName ? `${tableName}-${AWSENV}` : '';
}

export async function handleList(tableName: string, user: User): Promise<Customer[]> {
  const result = await listData(tableName, user);
  return result || [];
}

export async function handleGet(tableName: string, objectId: string, user: User): Promise<Customer> {
  const result = await getData(tableName, objectId, user);
  if (!result) throw new CustomAxiosError(`Item not found`, { status: NotFound, data: { tableName, objectId, user }});
  return result;
}

export async function handleCreate(tableName: string, customer: Customer, user: User): Promise<Customer> {
  const result = await createData(tableName, customer, user);
  return result || {};
}

export async function handleUpdate(tableName: string, customer: Partial<Customer>, user: User): Promise<Customer> {
  const result = await updateData(tableName, customer, user);
  return result || {};
}

export async function handleDelete(tableName: string, id: string, user: User): Promise<void> {
  await deleteData(tableName, id, user);
}
