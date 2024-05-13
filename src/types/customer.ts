export type Customer = {
  tenantId: string;
  id: string;
  customerType?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobileNumber?: string;
  deviceId?: string;
  deviceOs?: string;
  encrypted?: string;
  status?: Status;
  createdBy?: string;
};

export type Status = 'pending' | 'approved' | 'declined';
