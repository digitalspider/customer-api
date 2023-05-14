export interface Context {
  [name: string]: string | number | boolean | null | undefined;
}

export type LoginInput = {
  username: string;
  password: string;
};

export type Auth = {
  username: string;
  password?: string;
  tenantId?: string;
  expiryInSec?: number;
  context?: Context;
  [x: string]: any; // eslint-disable-line
};
