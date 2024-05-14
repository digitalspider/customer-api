import { unmarshall } from '@aws-sdk/util-dynamodb';
import { AWSENV } from '../../common/config';
import { Auth } from '../../types/auth';
import { create, deleteItem as _delete, get, scan, update, query } from '../aws/dynamoService';

const TABLE_NAME = `auth-${AWSENV}`;

type Item = Auth;

type KeyValue = {
  name: string;
  value: string | boolean | number;
};

function getDynamoKey(keys: Item) {
  const { userId } = keys;
  return { userId };
}

export async function createItem(item: Item): Promise<Item> {
  await create(TABLE_NAME, getDynamoKey(item), item);
  return getItem(item);
}

export async function getItem(item: Item): Promise<Item> {
  const response = await get(TABLE_NAME, getDynamoKey(item));
  return response.Item as Item;
}

export async function listItems(): Promise<Item[]> {
  const response = await scan({
    TableName: TABLE_NAME,
  });
  const items = response.Items || [];
  return items.map((item) => unmarshall(item)) as Item[];
}

export async function updateItem(item: Item): Promise<Item> {
  const { tenantId, expiryInSec } = item;
  const updates: KeyValue[] = [];
  if (tenantId !== undefined && tenantId !== null) {
    updates.push({ name: 'tenantId', value: tenantId });
  }
  if (expiryInSec !== undefined && expiryInSec !== null) {
    updates.push({ name: 'expiryInSec', value: expiryInSec });
  }
  if (expiryInSec !== undefined && expiryInSec !== null) {
    updates.push({ name: 'username', value: expiryInSec });
  }

  const { UpdateExpression, ExpressionAttributeValues } = getDynamoUpdateExpressions(updates);
  const input = {
    TableName: TABLE_NAME,
    Key: getDynamoKey(item),
    UpdateExpression,
    ExpressionAttributeValues,
  };
  const response = await update(input);
  return response.Attributes as Item;
}

export async function deleteItem(item: Item): Promise<void> {
  await _delete(TABLE_NAME, getDynamoKey(item));
}

function getDynamoUpdateExpressions(input: KeyValue[]) {
  const UpdateExpression = 'set ' + input.map((kv) => `${kv.name} = :${kv.name}`).join(',');
  const ExpressionAttributeValues = {} as any; // eslint-disable-line
  input.forEach((kv) => {
    ExpressionAttributeValues[`:${kv.name}`] = kv.value;
  });
  return { UpdateExpression, ExpressionAttributeValues };
}

export async function count(): Promise<number> {
  const response = await scan({
    TableName: TABLE_NAME,
    Select: 'COUNT',
  });
  const count = response.Items?.length || 0;
  return count;
}

/**
 * assuming all input value is a string
 * condition is equal only
 *
 * @param inputs { name: 'ronnie', age: '29' }
 * @returns
  {
    "FilterExpression": "#name = :name = #age = :age",
    "ExpressionAttributeNames": { "#name": "name", "#age": "age" },
    "ExpressionAttributeValues": { ":name": { "S": "ronnie" }, ":age": { "S": "24" } }
  }
 */
function getFilterExpression(inputs: { [key: string]: string }) {
  const filterExpression = [];
  const ExpressionAttributeNames: { [key: string]: string } = {};
  const ExpressionAttributeValues: { [key: string]: any } = {};  // eslint-disable-line

  for (const [key, value] of Object.entries(inputs)) {
    filterExpression.push(`#${key} = :${key}`);
    ExpressionAttributeNames['#' + key] = key;
    ExpressionAttributeValues[':' + key] = { S: value };
  }

  return {
    FilterExpression: filterExpression.join(' AND '),
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  };
}

export async function searchItems(filter: { [key: string]: string }): Promise<Item[]> {
  const response = await scan({
    TableName: TABLE_NAME,
    ...getFilterExpression(filter),
  });

  const items = response.Items || [];
  return items.map((item) => unmarshall(item)) as Item[];
}

export async function queryIndex(IndexName: string, filter: { [key: string]: string }): Promise<Item[]> {
  const response = await query({
    TableName: TABLE_NAME,
    IndexName,
    ...getFilterExpression(filter),
  });

  const items = response.Items || [];
  return items.map((item) => unmarshall(item)) as Item[];
}