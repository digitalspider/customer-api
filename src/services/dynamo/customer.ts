import { unmarshall } from '@aws-sdk/util-dynamodb';
import { AWSENV } from '../../common/config';
import { Customer } from '../../types/customer';
import { create, deleteItem as _delete, get, scan, update } from '../aws/dynamoService';

const TABLE_NAME = `customers-${AWSENV}`;

type Item = Customer;

type KeyValue = {
  name: string;
  value: string | boolean;
};

function getDynamoKey(keys: Item) {
  const { tenantId, id } = keys;
  return { tenantId, id };
}

export async function createItem(item: Item): Promise<Item> {
  await create(TABLE_NAME, getDynamoKey(item), item);
  return getItem(item);
}

export async function getItem(item: Item): Promise<Item> {
  const response = await get(TABLE_NAME, getDynamoKey(item));
  return response.Item as Item;
}

export async function listItems(pk: string): Promise<Item[]> {
  const response = await scan({
    TableName: TABLE_NAME,
    FilterExpression: '#tenantId = :tenantId',
    ExpressionAttributeNames: { '#tenantId': 'tenantId' },
    ExpressionAttributeValues: { ':tenantId': { S: pk } },
  });
  const items = response.Items || [];
  return items.map((item) => unmarshall(item)) as Item[];
}

export async function updateItem(item: Item): Promise<Item> {
  const { firstName, lastName, email, mobileNumber, deviceId, deviceOs, encrypted, customerType } = item;
  const updates: KeyValue[] = [];
  if (encrypted !== undefined && encrypted !== null) {
    updates.push({ name: 'encrypted', value: encrypted });
  }
  if (firstName !== undefined && firstName !== null) {
    updates.push({ name: 'firstName', value: firstName });
  }
  if (lastName !== undefined && lastName !== null) {
    updates.push({ name: 'lastName', value: lastName });
  }
  if (email !== undefined && email !== null) {
    updates.push({ name: 'email', value: email });
  }
  if (mobileNumber !== undefined && mobileNumber !== null) {
    updates.push({ name: 'mobileNumber', value: mobileNumber });
  }
  if (customerType !== undefined && customerType !== null) {
    updates.push({ name: 'customerType', value: customerType });
  }
  if (deviceId !== undefined && deviceId !== null) {
    updates.push({ name: 'deviceId', value: deviceId });
  }
  if (deviceOs !== undefined && deviceOs !== null) {
    updates.push({ name: 'deviceOs', value: deviceOs });
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
  // eslint-disable-line
  const filterExpression = [];
  const ExpressionAttributeNames: { [key: string]: string } = {};
  const ExpressionAttributeValues: { [key: string]: any } = {};

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
