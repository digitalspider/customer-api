import { HttpStatusCode } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../types/auth';
import { CustomAxiosError } from '../types/error';
import * as dynamo from './dynamo/data';

const { NotFound, Forbidden } = HttpStatusCode;

type Item = dynamo.Item;
type ListResultItem = {
  total: number;
  data: Item[];
}
export type ListResults = {
  total: number;
  self?: ListResultItem;
  [x: string]: any;
}

export async function listData(tableName: string, user: User): Promise<ListResults> {
  const { userId, claims = [] } = user;
  const indexName = 'createdBy-index'
  const KeyConditionExpression = 'createdBy = :createdBy';
  const ExpressionAttributeValues = { ':createdBy': userId };
  const userResults = await dynamo.queryIndex(tableName, indexName, KeyConditionExpression, ExpressionAttributeValues);
  const total = (userResults || []).length || 0;
  const results: ListResults = { total, self: { total, data: userResults }};
  let groupsTotal = 0;
  const promises = claims.filter(claim => claim.endsWith(':read')).map(async (claim) => {
    const groupId = claim.replace(':read', '');
    const indexName = 'groupId-index'
    const KeyConditionExpression = 'groupId = :groupId';
    const ExpressionAttributeValues = { ':groupId': groupId };
    const groupResults = (await dynamo.queryIndex(tableName, indexName, KeyConditionExpression, ExpressionAttributeValues)) || [];
    const { length: groupTotal = 0 } = groupResults;
    results[groupId] = { total: groupTotal, data: groupResults };
    groupsTotal += groupTotal;
  });
  await Promise.all(promises);
  results.total += groupsTotal;
  return results;
}

export async function getData(tableName: string, id: string, user: User, requiredClaim = 'read'): Promise<Item> {
  const { userId, claims = [] } = user;
  const item = { id };
  const result = await dynamo.getItem(tableName, item);
  if (!result) {
    throw new CustomAxiosError(`Item not found`, { status: NotFound, data: { tableName, id, user }});
  }
  const { createdBy, groupId } = result;
  if (createdBy === userId) return result;
  if (!groupId || !claims.includes(`${groupId}:${requiredClaim}`)) {
    throw new CustomAxiosError(`Forbidden`, { status: Forbidden, data: { tableName, id, user, groupId, createdBy }});
  }
  return result;
}

export async function createData(tableName: string, itemData: Item, user: User): Promise<Item> {
  const { id = uuidv4() } = itemData;
  const { userId } = user;
  const item = { id, createdBy: userId, ...cleanInput(itemData) };
  return await dynamo.createItem(tableName, item);
}

export async function updateData(tableName: string, itemData: Partial<Item>, user: User): Promise<Item> {
  const { id } = itemData;
  if (!id) throw new Error(`Cannot update ${tableName} without required properties: id`);
  await getData(tableName, id, user, 'write');
  const item = { id, updatedBy: user.userId, ...cleanInput(itemData) };
  return dynamo.updateItem(tableName, item);
}

export async function deleteData(tableName: string, id: string, user: User): Promise<void> {
  if (!id) throw new Error(`Cannot delete ${tableName} without required properties: id`);
  await getData(tableName, id, user, 'delete');
  const item = { id, createdBy: user.userId };
  return dynamo.deleteItem(tableName, item);
}

function cleanInput(input: Partial<Item>): Partial<Omit<Item, 'createdBy' | 'id'>> {
  const { createdBy, id, ...validInput } = input; // eslint-disable-line
  return validInput;
}
