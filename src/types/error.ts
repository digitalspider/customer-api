export interface CustomAxiosErrorOptions {
  url?: string;
  partnerName?: string;
  userId?: string;
  status?: number;
  data?: any; //eslint-disable-line
  originalStack?: string[];
}

export class CustomAxiosError extends Error {
  url?: string;
  partnerName?: string;
  userId?: string;
  status?: number;
  data?: any; //eslint-disable-line
  originalStack?: string[];

  constructor(message: string, options: CustomAxiosErrorOptions) {
    super(message);
    const { url, partnerName, userId, status, data, originalStack } = options;
    this.url = url;
    this.partnerName = partnerName;
    this.userId = userId;
    this.status = status;
    this.data = data;
    this.originalStack = originalStack;
  }
}
