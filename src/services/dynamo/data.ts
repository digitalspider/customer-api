import { create, deleteItem as _delete, get, scan, update, query } from '../aws/dynamoService';

export type DataKey = {
  id: string;
};
export type AuditData = {
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  deletedBy?: string;
  deletedAt?: string;
};
export type Item = AuditData & DataKey & {
  groupId?: string;
  tags?: string;
  payload?: any;
  encPayload?: string;
};

type KeyValue = {
  name: string;
  value: string | boolean;
};

function getDynamoKey(keys: Item): DataKey {
  const { id } = keys;
  return { id };
}

export async function createItem(tableName: string, item: Item): Promise<Item> {
  const createdAt = new Date().toISOString();
  const itemData = { ...item, createdAt };
  await create(tableName, getDynamoKey(item), itemData);
  return getItem(tableName, item);
}

export async function getItem(tableName: string, item: Item): Promise<Item> {
  const response = await get(tableName, getDynamoKey(item));
  return response.Item as Item;
}

export async function listItems(tableName: string): Promise<Item[]> {
  const response = await scan({
    TableName: tableName,
  });
  const items = response.Items || [];
  return items.map((item) => (item)) as Item[];
}

export async function updateItem(tableName: string, item: Item): Promise<Item> {
  const keys = Object.getOwnPropertyNames(item);
  const updates: KeyValue[] = [];
  keys.map(key => {
    if (!['id','createdAt','createdBy'].includes(key)) {
      const value = (item as any)[key];
      if (value !== undefined && value !== null) {
        updates.push({ name: key, value });
      }
    }
  });
  const updatedAt = new Date().toISOString();
  updates.push({ name: 'updatedAt', value: updatedAt });

  const { UpdateExpression, ExpressionAttributeValues } = getDynamoUpdateExpressions(updates);
  const input = {
    TableName: tableName,
    Key: getDynamoKey(item),
    UpdateExpression,
    ExpressionAttributeValues,
  };
  const response = await update(input);
  return response.Attributes as Item;
}

export async function deleteItem(tableName: string, item: Item): Promise<void> {
  await _delete(tableName, getDynamoKey(item));
}

function getDynamoUpdateExpressions(input: KeyValue[]) {
  const UpdateExpression = 'set ' + input.map((kv) => `${kv.name} = :${kv.name}`).join(',');
  const ExpressionAttributeValues = {} as any; // eslint-disable-line
  input.forEach((kv) => {
    ExpressionAttributeValues[`:${kv.name}`] = kv.value;
  });
  return { UpdateExpression, ExpressionAttributeValues };
}

export async function count(tableName: string): Promise<number> {
  const response = await scan({
    TableName: tableName,
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
  const ExpressionAttributeValues: { [key: string]: any } = {}; // eslint-disable-line

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

export async function searchItems(tableName: string, filter: { [key: string]: string }): Promise<Item[]> {
  const response = await scan({
    TableName: tableName,
    ...getFilterExpression(filter),
  });

  const items = response.Items || [];
  return items.map((item) => (item)) as Item[];
}

export async function queryIndex(tableName: string, indexName: string, KeyConditionExpression: string, ExpressionAttributeValues: Record<string, any>): Promise<Item[]> {
  const response = await query({
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression,
    ExpressionAttributeValues,
  });

  const items = response.Items || [];
  // return items.map((item) => unmarshall(item)) as Item[];
  return items.map((item) => item) as Item[];
}