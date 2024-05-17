export type ItemKey = {
  tenantId: string;
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

export type Customer = ItemKey & AuditData & {
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
