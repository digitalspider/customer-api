import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { AWS } from '../../common/constants';

const { AWS_REGION_APSE2 } = AWS.REGIONS;

let client: SecretsManagerClient;

function getClient() {
  return new SecretsManagerClient({
    region: AWS_REGION_APSE2,
  });
}

/**
 * Return the secret stored in env variable if available.
 * Otherwise retrieve it from secrets manager.
 * @param {string} secretName the name of the secret
 * @param {boolean} isJson if true to a JSON.parse() on the results
 */
export async function getSecret(secretName: string, isJson = true) {
  // First check if the secret has been passed via Environment variable...
  const secretFromEnvVariable = getSecretFromEnvVariable(secretName, isJson);
  if (secretFromEnvVariable) {
    return secretFromEnvVariable;
  }
  // ... and only retrieve it from the secrets manager if it hasn't been passed
  return getSecretFromSecretsManager(secretName, isJson);
}

/**
 * Try retrieving a secret from env variable.
 * The name of the env variable should be of the form "Secret_${adjustedSecretName}", where
 * adjustedSecretName is the secret name with all "-" replaced with "_" and uppercase
 * eg. "SECRET_KEY_NAME"
 * @param {string} secretName the name of the secret
 * @param {boolean} isJson if true to a JSON.parse() on the results
 */
function getSecretFromEnvVariable(secretName: string, isJson = true) {
  if (!secretName) return null;

  const envName = `SECRET_${secretName.replace(/-/g, '_')}`.toUpperCase();
  const secretString = process.env[envName];
  if (!secretString) {
    return null;
  }
  return isJson ? JSON.parse(secretString) : secretString;
}

/**
 * Decrypts secret using the associated KMS CMK.
 * Depending on whether the secret is a string or binary, one of these fields will be populated.
 * @param {string} secretName the name of the secret
 * @param {boolean} isJson if true to a JSON.parse() on the results
 */
async function getSecretFromSecretsManager(secretName: string, isJson = true) {
  if (!client) {
    client = getClient();
  }
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  let secretString: string;
  // Decode based on the secret type
  if (response.SecretString !== undefined) {
    secretString = response.SecretString;
  } else if (response.SecretBinary !== undefined) {
    secretString = Buffer.from(response.SecretBinary as any, 'base64').toString('ascii'); // eslint-disable-line
  } else {
    throw new Error(`The secret '${secretName}' is malformed.`);
  }
  return isJson ? JSON.parse(secretString) : secretString;
}
