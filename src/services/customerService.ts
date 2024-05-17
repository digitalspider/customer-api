import { v4 as uuidv4 } from 'uuid';
import { Customer } from '../types/customer';
import * as dynamo from './dynamo/customer';

const DEFAULT_TENANT = 'public';

export async function listCustomers(tenantId = DEFAULT_TENANT): Promise<Customer[]> {
  const results = await dynamo.listItems(tenantId);
  return results;
}

export async function getCustomer(id: string, tenantId = DEFAULT_TENANT): Promise<Customer> {
  const item = { tenantId, id };
  const result = await dynamo.getItem(item);
  return result;
}

export async function createCustomer(customer: Customer): Promise<Customer> {
  const { id = uuidv4(), tenantId = DEFAULT_TENANT } = customer;
  const item = { tenantId, id, ...cleanInput(customer) };
  return dynamo.createItem(item);
}

export async function updateCustomer(customer: Partial<Customer>): Promise<Customer> {
  const { id, tenantId = DEFAULT_TENANT } = customer;
  if (!id) throw new Error('Cannot update customer without required properties: id');
  if (!tenantId) throw new Error('Cannot update customer without required properties: tenantId');
  const item = { tenantId, id, ...cleanInput(customer) };
  return dynamo.updateItem(item);
}

export async function deleteCustomer(id: string, tenantId = DEFAULT_TENANT): Promise<void> {
  const item = { tenantId, id };
  return dynamo.deleteItem(item);
}

function cleanInput(input: Partial<Customer>): Partial<Omit<Customer, 'tenantId' | 'id'>> {
  const { tenantId, id, ...validInput } = input; // eslint-disable-line
  return validInput;
}
