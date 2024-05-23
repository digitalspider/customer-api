import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { HttpStatusCode } from 'axios';
import { HTTP_METHOD } from '../common/constants';
import { createData, deleteData, getData, listData, updateData } from '../services/dataService';
import { createResponse, parsePath } from '../services/utils';
import { Customer } from '../types/customer';
import { CustomAxiosError } from '../types/error';

const { Ok, MethodNotAllowed, InternalServerError, BadRequest, NotFound } = HttpStatusCode;
const { GET, POST, PUT, DELETE } = HTTP_METHOD;

export async function handleEvent(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const { httpMethod, path, body: bodyString, requestContext, pathParameters } = event;
  const { awsRequestId } = context;
  const { authorizer } = requestContext || {};
  const { tenantId, username, userId } = authorizer || {};
  const { uuid: objectId } = pathParameters || {};
  const body = bodyString ? JSON.parse(bodyString) : undefined;
  const { pathParts, pathFirst: tableName = '' } = parsePath(path);
  console.debug('request', {
    handler: 'appHandler',
    httpMethod,
    path,
    awsRequestId,
    tenantId,
    objectId,
    username,
    userId,
    tableName,
    pathParts,
    body,
  });

  try {
    let result;
    switch (httpMethod) {
      case GET:
        if (path.endsWith(`/${tableName}`)) {
          result = await handleList(tableName, tenantId);
        } else {
          if (!objectId) throw new CustomAxiosError(`Failed to get item: ${tableName}. Missing parameter: id`, { status: BadRequest });
          result = await handleGet(tableName, tenantId, objectId, userId);
        }
        break;
      case POST:
        if (path.endsWith(`/${tableName}`)) {
          result = await handleCreate(tableName, tenantId, body as Customer, userId);
        }
        break;
      case PUT:
        if (!objectId) throw new CustomAxiosError(`Failed to update item: ${tableName}. Missing parameter: id`, { status: BadRequest });
        result = await handleUpdate(tableName, tenantId, { ...body, id: objectId } as Partial<Customer>, userId);
        break;
      case DELETE:
        if (!objectId) throw new CustomAxiosError(`Failed to delete item: ${tableName}. Missing parameter: id`, { status: BadRequest });
        result = await handleDelete(tableName, tenantId, objectId, userId);
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

export async function handleList(tableName: string, tenantId: string): Promise<Customer[]> {
  const result = await listData(tableName, tenantId);
  return result || [];
}

export async function handleGet(tableName: string, tenantId: string, objectId: string, userId: string): Promise<Customer> {
  const result = await getData(tableName, objectId, tenantId);
  return result || {};
}

export async function handleCreate(tableName: string, tenantId: string, customer: Customer, userId: string): Promise<Customer> {
  const customerData = { ...customer, tenantId, createdBy: userId } as Customer;
  const result = await createData(tableName, customerData);
  return result || {};
}

export async function handleUpdate(tableName: string, tenantId: string, customer: Partial<Customer>, userId: string): Promise<Customer> {
  const { id } = customer;
  if (!id) throw new CustomAxiosError(`Item missing id`, { status: NotFound });
  const item = await handleGet(tableName, tenantId, id, userId);
  if (!item) throw new CustomAxiosError(`Item not found: ${id}`, { status: NotFound, data: { id }});
  const customerData = { ...customer, tenantId, updatedBy: userId } as Customer;
  const result = await updateData(tableName, customerData);
  return result || {};
}

export async function handleDelete(tableName: string, tenantId: string, id: string, userId: string): Promise<void> {
  const item = await handleGet(tableName, tenantId, id, userId);
  if (!item) throw new CustomAxiosError(`Item not found: ${id}`, { status: NotFound, data: { id }});
  await deleteData(tableName, item.id, tenantId);
}
