export interface Context {
  [name: string]: string | number | boolean | null | undefined;
}

export type LoginInput = {
  username: string;
  password: string;
  expiryInSec?: number;
};

export type User = {
  userId: string;
  username?: string;
  tenantId?: string;
  claims?: string[];
  publicKey?: string;
  privateKey?: string;
};

export type Auth = User & {
  password?: string;
  expiryInSec?: number;
  email?: string;
  mobile?: string;
  context?: Context;
  claims?: string;
  publicKey?: string;
  privateKey?: string;
  [x: string]: any; // eslint-disable-line
};
