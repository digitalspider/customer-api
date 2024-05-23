import { AuditData, Item } from "../services/dynamo/data";

export type Customer = Item & AuditData & {
  customerType?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobileNumber?: string;
  deviceId?: string;
  deviceOs?: string;
  encrypted?: string;
  status?: Status;
};

export type Status = 'pending' | 'approved' | 'declined';
