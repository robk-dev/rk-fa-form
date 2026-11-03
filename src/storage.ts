import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { randomUUID } from 'node:crypto';
import type { Contact, SaveContact } from './handler.js';

let service: BlobServiceClient | undefined;
export const saveContact: SaveContact = async (contact: Contact) => {
  const endpoint = process.env.CONTACT_STORAGE_URL;
  if (!endpoint) throw new Error('Contact storage is not configured');
  service ??= new BlobServiceClient(endpoint, new DefaultAzureCredential(), {
    retryOptions: { maxTries: 2, tryTimeoutInMs: 10000 },
  });
  const receivedAt = new Date().toISOString();
  const id = randomUUID();
  const blob = service.getContainerClient('contact-submissions')
    .getBlockBlobClient(`${receivedAt.slice(0,10)}/${id}.json`);
  await blob.uploadData(Buffer.from(JSON.stringify({ id, receivedAt, ...contact })), {
    blobHTTPHeaders: { blobContentType: 'application/json; charset=utf-8' },
    conditions: { ifNoneMatch: '*' },
    abortSignal: AbortSignal.timeout(20000),
  });
};
