import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocument,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
  QueryCommandInput,
  UpdateCommandInput,
  ScanCommand,
  ScanCommandInput,
  ScanCommandOutput,
  QueryCommandOutput,
  UpdateCommandOutput,
  GetCommandOutput,
  PutCommandOutput,
  BatchGetCommandOutput,
  BatchGetCommand,
  BatchGetCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { AWS } from '../../common/constants';

const { AWS_REGION_APSE2 } = AWS.REGIONS;

// see https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-dynamodb
// see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.01
// see https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html
// see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html

const ddbClient = new DynamoDBClient({
  region: AWS_REGION_APSE2,
});

const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: true, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: true, // false, by default.
};

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
};

const translateConfig = { marshallOptions, unmarshallOptions };

// Create the DynamoDB Document client.
const ddbDocClient = DynamoDBDocument.from(ddbClient, translateConfig);

export function getDynamoDBClient(): DynamoDBClient {
  return ddbClient;
}

export function getDynamoDocClient() {
  return ddbDocClient;
}

export async function create(
  TableName: string,
  Key: { [key: string]: string },
  content?: any, // eslint-disable-line
): Promise<PutCommandOutput> {
  const params = {
    TableName,
    Item: {
      ...Key,
      ...content,
    },
  };

  const data = await ddbDocClient.send(new PutCommand(params));
  // console.debug('Success - item added or updated', data);
  return data;
}

export async function get(TableName: string, Key: { [key: string]: string }): Promise<GetCommandOutput> {
  const params = {
    TableName,
    Key,
  };

  const data = await ddbDocClient.send(new GetCommand(params));
  // console.debug('Success :', data);
  // console.debug('Success :', data.Item);
  return data;
}

/**
 * @param input has the below
 * // Define expressions for the new or updated attributes
    UpdateExpression: 'set ATTRIBUTE_NAME_1 = :t, ATTRIBUTE_NAME_2 = :s', // For example, "'set Title = :t, Subtitle = :s'"
    ExpressionAttributeValues: {
      ':t': 'NEW_ATTRIBUTE_VALUE_1', // For example ':t' : 'NEW_TITLE'
      ':s': 'NEW_ATTRIBUTE_VALUE_2', // For example ':s' : 'NEW_SUBTITLE'
    },
    ReturnValues: 'ALL_NEW',
 */
export async function update(input: UpdateCommandInput): Promise<UpdateCommandOutput> {
  const {
    TableName,
    Key,
    UpdateExpression,
    ExpressionAttributeValues,
    ExpressionAttributeNames,
    ReturnValues = 'ALL_NEW',
  } = input || {};
  const params = {
    TableName,
    Key,
    // Define expressions for the new or updated attributes
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues,
  };

  const data = await ddbDocClient.send(new UpdateCommand(params));
  // console.debug('Success - item added or updated', data);
  return data;
}

/**
 * @param input has the below
    ExpressionAttributeValues: {
      ':s': 1,
      ':e': 1,
      ':topic': 'Title2',
    },
    // Specifies the values that define the range of the retrieved items. In this case, items in Season 2 before episode 9.
    KeyConditionExpression: 'Season = :s and Episode > :e',
    // Filter that returns only episodes that meet previous criteria and have the subtitle 'The Return'
    FilterExpression: 'contains (Subtitle, :topic)',
 */
export async function query(input: QueryCommandInput): Promise<QueryCommandOutput> {
  const { TableName, ExpressionAttributeValues, KeyConditionExpression, FilterExpression } = input || {};
  const params = {
    TableName,
    ExpressionAttributeValues,
    // Specifies the values that define the range of the retrieved items. In this case, items in Season 2 before episode 9.
    KeyConditionExpression,
    // Filter that returns only episodes that meet previous criteria and have the subtitle 'The Return'
    FilterExpression,
  };
  const data = await ddbDocClient.send(new QueryCommand(params));
  // console.debug('Success. Item details: ', data);
  // console.debug('Success. Item details: ', data.Items);
  return data;
}

/**
 * @param input has the below
    ExpressionAttributeValues: {
      ':s': 1,
      ':e': 1,
      ':topic': 'Title2',
    },
    // Filter that returns only episodes that meet previous criteria and have the subtitle 'The Return'
    FilterExpression: 'contains (Subtitle, :topic)',
 */
export async function scan(input: ScanCommandInput): Promise<ScanCommandOutput | { Items: [] }> {
  const {
    TableName,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    FilterExpression,
    ProjectionExpression,
    Select,
    Limit,
  } = input || {};
  const params = {
    TableName,
    FilterExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    Limit,
    ProjectionExpression,
    Select,
  };

  const data = await ddbDocClient.send(new ScanCommand(params));
  // console.debug('Success. Item details: ', data);
  // console.debug('Success. Item details: ', data.Items);
  return data;
}

export async function deleteItem(TableName: string, Key: { [key: string]: string }) {
  const params = {
    TableName,
    Key,
  };
  const data = await ddbDocClient.send(new DeleteCommand(params));
  // console.debug('Success - item deleted');
  return data;
}

export async function batchGet(TableName: string, Keys: { [key: string]: string }[]): Promise<BatchGetCommandOutput> {
  const params: BatchGetCommandInput = {
    RequestItems: {
      [TableName]: { Keys },
    },
  };
  const data = await ddbDocClient.send(new BatchGetCommand(params));
  return data;
}
