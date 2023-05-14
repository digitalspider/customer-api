import type { Readable } from 'stream';
import {
  GetObjectCommand,
  GetObjectCommandInput,
  GetObjectCommandOutput,
  S3Client,
  ListObjectsCommand,
  ListObjectsCommandInput,
  ListObjectsCommandOutput,
  CopyObjectCommand,
  CopyObjectCommandInput,
  CopyObjectCommandOutput,
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  DeleteObjectCommandOutput,
  PutObjectCommand,
  PutObjectCommandInput,
  PutObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { AWS } from '../../common/constants';

const { AWS_REGION_APSE2 } = AWS.REGIONS;

let s3Client: S3Client;

function getClient() {
  return new S3Client({
    region: AWS_REGION_APSE2,
  });
}

export async function upload(input: PutObjectCommandInput): Promise<PutObjectCommandOutput> {
  s3Client = s3Client || getClient();
  return s3Client.send(new PutObjectCommand(input));
}

export async function getObject(input: GetObjectCommandInput): Promise<GetObjectCommandOutput> {
  s3Client = s3Client || getClient();
  return s3Client.send(new GetObjectCommand(input));
}

export async function listFiles(input: ListObjectsCommandInput): Promise<ListObjectsCommandOutput> {
  s3Client = s3Client || getClient();
  return s3Client.send(new ListObjectsCommand(input));
}

export async function copyFile(input: CopyObjectCommandInput): Promise<CopyObjectCommandOutput> {
  s3Client = s3Client || getClient();
  return s3Client.send(new CopyObjectCommand(input));
}

export async function deleteFile(input: DeleteObjectCommandInput): Promise<DeleteObjectCommandOutput> {
  s3Client = s3Client || getClient();
  return s3Client.send(new DeleteObjectCommand(input));
}

export async function getObjectToBuffer(Bucket: string, Key: string) {
  const response = await getObject({
    Bucket,
    Key,
  });

  const stream = response.Body as Readable;

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.once('end', () => resolve(Buffer.concat(chunks)));
    stream.once('error', reject);
  });
}
