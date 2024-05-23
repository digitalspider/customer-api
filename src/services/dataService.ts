import { v4 as uuidv4 } from 'uuid';
import * as dynamo from './dynamo/data';

const DEFAULT_TENANT = 'public';

type Item = dynamo.Item;

export async function listData(tableName: string, tenantId = DEFAULT_TENANT): Promise<Item[]> {
  const results = await dynamo.listItems(tableName, tenantId);
  return results;
}

export async function getData(tableName: string, id: string, tenantId = DEFAULT_TENANT): Promise<Item> {
  const item = { tenantId, id };
  const result = await dynamo.getItem(tableName, item);
  return result;
}

export async function createData(tableName: string, itemData: Item): Promise<Item> {
  const { id = uuidv4(), tenantId = DEFAULT_TENANT } = itemData;
  const item = { tenantId, id, ...cleanInput(itemData) };
  return await dynamo.createItem(tableName, item);
}

export async function updateData(tableName: string, itemData: Partial<Item>): Promise<Item> {
  const { id, tenantId = DEFAULT_TENANT } = itemData;
  if (!id) throw new Error(`Cannot update ${tableName} without required properties: id`);
  if (!tenantId) throw new Error(`Cannot update ${tableName} without required properties: tenantId`);
  const item = { id, tenantId, ...cleanInput(itemData) };
  return dynamo.updateItem(tableName, item);
}

export async function deleteData(tableName: string, id: string, tenantId = DEFAULT_TENANT): Promise<void> {
  const item = { tenantId, id };
  return dynamo.deleteItem(tableName, item);
}

function cleanInput(input: Partial<Item>): Partial<Omit<Item, 'tenantId' | 'id'>> {
  const { tenantId, id, ...validInput } = input; // eslint-disable-line
  return validInput;
}
