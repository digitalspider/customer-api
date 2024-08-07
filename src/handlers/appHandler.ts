import { ResourceNotFoundException } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { HttpStatusCode } from 'axios';
import { AWSENV, MAX_ARRAY_LIMIT, VALID_PATHS } from '../common/config';
import { HTTP_METHOD } from '../common/constants';
import { createTable, describeTable } from '../services/aws/dynamoService';
import { ListResults, createData, deleteData, getData, listData, updateData } from '../services/data/dataService';
import { Item } from '../services/dynamo/data';
import { createResponse, groupSettledPromises, parsePath } from '../services/utils/utils';
import { User } from '../types/auth';
import { CustomAxiosError } from '../types/error';

const { Ok, MethodNotAllowed, InternalServerError, BadRequest, PreconditionFailed } = HttpStatusCode;
const { GET, POST, PUT, DELETE } = HTTP_METHOD;

export async function handleEvent(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const { httpMethod, path, body: bodyString, requestContext, pathParameters } = event;
  const { awsRequestId } = context;
  const { authorizer } = requestContext || {};
  const { tenantId, username, userId, claims: claimsInput = '', publicKey, privateKey } = authorizer || {};
  const user: User = { tenantId, username, userId, claims: claimsInput.trim().split(','), publicKey, privateKey };
  const { publicKey: x, privateKey: y, ...safeToPrintUser } = user;
  const { uuid: objectId, objectType } = pathParameters || {};
  const body = bodyString ? JSON.parse(bodyString) : undefined;
  const { pathParts, pathFirst = '' } = parsePath(path, objectType);
  const tableName = getTableName(pathFirst, tenantId);
  console.debug('request', {
    handler: 'appHandler',
    httpMethod,
    path,
    awsRequestId,
    user: safeToPrintUser,
    objectId,
    objectType,
    tableName,
    pathParts,
    pathFirst,
    body,
  });

  try {
    let result;
    await validatePath(pathFirst);
    await validateOrCreateTable(tableName);
    switch (httpMethod) {
      case GET:
        if (path.endsWith(`/${pathFirst}`)) {
          result = await handleList(tableName, user);
        } else {
          if (!objectId) throw new CustomAxiosError(`Failed to get item: ${pathFirst}. Missing parameter: id`, { status: BadRequest });
          result = await handleGet(tableName, objectId, user);
        }
        break;
      case POST:
        if (path.endsWith(`/${pathFirst}`)) {
          result = await handleCreate(tableName, body as Item, user);
        }
        break;
      case PUT:
        if (!objectId) throw new CustomAxiosError(`Failed to update item: ${pathFirst}. Missing parameter: id`, { status: BadRequest });
        result = await handleUpdate(tableName, { ...body, id: objectId } as Partial<Item>, user);
        break;
      case DELETE:
        if (!objectId) throw new CustomAxiosError(`Failed to delete item: ${pathFirst}. Missing parameter: id`, { status: BadRequest });
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
      user: safeToPrintUser,
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

export function validatePath(path: string): void {
  const validPaths = VALID_PATHS.trim().replace(/\s+/,'').split(',');
  if (!validPaths.includes(path)) throw new CustomAxiosError(`Invalid path ${path}. Expected: ${validPaths}`, { status: BadRequest });
}

export async function validateOrCreateTable(tableName: string): Promise<void> {
  if (!tableName) return;
  try {
    const { Table = {} } = await describeTable(tableName);
    const { TableStatus } = Table;
    if (TableStatus !== 'ACTIVE') throw new CustomAxiosError('Table creation in progress. Please wait and try again', { status: PreconditionFailed, data: tableName })
  } catch (e) {
    if (!(e instanceof ResourceNotFoundException)) {
      throw e;
    }
    console.debug(`Table does not exist. Creating table: ${tableName}`);
    await createTable(tableName);
    throw new CustomAxiosError('Table creation in progress. Please wait and try again', { status: PreconditionFailed, data: tableName })
  }
}

export async function handleList(tableName: string, user: User): Promise<ListResults> {
  const result = await listData(tableName, user);
  return result || {};
}

export async function handleGet(tableName: string, objectId: string, user: User): Promise<Item> {
  const result = await getData(tableName, objectId, user);
  return result || {};
}

export async function handleCreate(tableName: string, customer: Item|Item[], user: User): Promise<Item|Item[]> {
  if (!Array.isArray(customer)) {
    const result = await createData(tableName, customer, user);
    return result || {};
  } else {
    const { length: dataLength } = customer;
    const maxLength = MAX_ARRAY_LIMIT;
    if (dataLength > maxLength) throw new CustomAxiosError(`Max array limit exceeded. Expected: ${maxLength}`, { status: BadRequest, data: { dataLength, maxLength } });
    const results = [] as Item[];
    const promises = customer.map(async (customerItem) => {
      const result = await createData(tableName, customerItem, user);
      results.push(result);
    });
    const responses = await Promise.allSettled(promises);
    const groupResults = groupSettledPromises(responses);
    if (groupResults?.errors?.length) throw new CustomAxiosError(`Error processing data array. Length=${dataLength}`, { status: InternalServerError, data: { groupResults } });
    return results || [];
  }
}

export async function handleUpdate(tableName: string, customer: Partial<Item>|Partial<Item>[], user: User): Promise<Item|Item[]> {
  if (!Array.isArray(customer)) {
    const result = await updateData(tableName, customer, user);
    return result || {};
  } else {
    const { length: dataLength } = customer;
    const maxLength = MAX_ARRAY_LIMIT;
    if (dataLength > maxLength) throw new CustomAxiosError(`Max array limit exceeded. Expected: ${maxLength}`, { status: BadRequest, data: { dataLength, maxLength } });
    const results = [] as Item[];
    const promises = customer.map(async (customerItem) => {
      const result = await updateData(tableName, customerItem, user);
      results.push(result);
    });
    const responses = await Promise.allSettled(promises);
    const groupResults = groupSettledPromises(responses);
    if (groupResults?.errors?.length) throw new CustomAxiosError(`Error processing data array. Length=${dataLength}`, { status: InternalServerError, data: { groupResults } });
    return results || [];
  }
}

export async function handleDelete(tableName: string, id: string|string[], user: User): Promise<void> {
  if (!Array.isArray(id)) {
    await deleteData(tableName, id, user);
  } else {
    const { length: dataLength } = id;
    const maxLength = MAX_ARRAY_LIMIT;
    if (dataLength > maxLength) throw new CustomAxiosError(`Max array limit exceeded. Expected: ${maxLength}`, { status: BadRequest, data: { dataLength, maxLength } });
    const promises = id.map(async (idItem) => {
      await deleteData(tableName, idItem, user);
    });
    const responses = await Promise.allSettled(promises);
    const groupResults = groupSettledPromises(responses);
    if (groupResults?.errors?.length) throw new CustomAxiosError(`Error processing data array. Length=${dataLength}`, { status: InternalServerError, data: { groupResults } });
  }
}
