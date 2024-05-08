export const AWSENV = process.env.AWSENV === 'local' ? 'dev' : process.env.AWSENV;

export const { 
  SECRET_MANAGER_NAME = `secrets-${AWSENV}`,
  DOMAIN_NAME,
} = process.env;

export const URL_UI = AWSENV === 'prod' ? DOMAIN_NAME : `${AWSENV}.${DOMAIN_NAME}`;
export const URL_API = AWSENV === 'prod' ? `api.${DOMAIN_NAME}` : `api-${AWSENV}.${DOMAIN_NAME}`;
export const URL_AUTH = URL_API; // TODO: AWSENV === 'prod' ? `auth.${DOMAIN_NAME}` : `auth-${AWSENV}.${DOMAIN_NAME}`;
