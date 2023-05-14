export const AWSENV = process.env.AWSENV === 'local' ? 'dev' : process.env.AWSENV;

export const { SECRET_MANAGER_NAME = `customer-secrets-${AWSENV}` } = process.env;

export const CUSTOMER_ENDPOINT =
  AWSENV === 'prod'
    ? 'https://customer-api.digitalspider.com.au/v1'
    : `https://customer-api.${AWSENV}.digitalspider.com.au/v1`;

export const AUTH_ENDPOINT = CUSTOMER_ENDPOINT;
