export const AWSENV = process.env.AWSENV === 'local' ? 'dev' : process.env.AWSENV;

export const { 
  SECRET_MANAGER_NAME = `secrets-${AWSENV}`,
  DOMAIN_NAME,
  URL_API,
  URL_UI,
  URL_AUTH,
} = process.env;
