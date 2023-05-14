import { v4 as uuidv4 } from 'uuid';
import { Customer } from '../types/customer';
import * as dynamo from './dynamo/customer';

export async function listCustomers(tenantId: string): Promise<Customer[]> {
  const results = await dynamo.listItems(tenantId);
  return results;
}

export async function getCustomer(tenantId: string, id: string): Promise<Customer> {
  const item = { tenantId, id };
  const result = await dynamo.getItem(item);
  return result;
}

export async function createCustomer(tenantId: string, customer: Customer): Promise<Customer> {
  const item = { tenantId, id: uuidv4(), ...cleanInput(customer) };
  return dynamo.createItem(item);
}

export async function updateCustomer(tenantId: string, id: string, customer: Customer): Promise<Customer> {
  const item = { tenantId, id, ...cleanInput(customer) };
  return dynamo.updateItem(item);
}

export async function deleteCustomer(tenantId: string, id: string): Promise<void> {
  const item = { tenantId, id };
  return dynamo.deleteItem(item);
}

function cleanInput(input: Customer): Omit<Customer, 'tenantId' | 'id'> {
  const { tenantId, id, ...validInput } = input; // eslint-disable-line
  return validInput;
}
