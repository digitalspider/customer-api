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
};

export type Status = 'pending' | 'approved' | 'declined';
