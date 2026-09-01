import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { env } from '../config/env.js';
import {
  notifyOrderPaidEmails,
  type PaidOrderNotifyPayload,
} from '../services/orderPaidEmails.js';

let sqsClient: SQSClient | null = null;

function getSqsClient(): SQSClient {
  if (!sqsClient) {
    sqsClient = new SQSClient({ region: env.AWS_REGION });
  }
  return sqsClient;
}

export function isEmailQueueEnabled(): boolean {
  return Boolean(env.EMAIL_QUEUE_URL?.trim());
}

export async function enqueueOrderPaidEmails(payload: PaidOrderNotifyPayload): Promise<void> {
  const queueUrl = env.EMAIL_QUEUE_URL?.trim();
  if (!queueUrl) {
    void notifyOrderPaidEmails(payload).catch((err) =>
      console.error('[enqueueOrderPaidEmails] inline fallback failed', err),
    );
    return;
  }

  await getSqsClient().send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
    }),
  );
}

function parseRecord(record: SQSRecord): PaidOrderNotifyPayload | null {
  try {
    return JSON.parse(record.body) as PaidOrderNotifyPayload;
  } catch (err) {
    console.error('[emailQueue] invalid message body', err);
    return null;
  }
}

export async function processEmailQueueEvent(event: SQSEvent): Promise<{ batchItemFailures: { itemIdentifier: string }[] }> {
  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    const payload = parseRecord(record);
    if (!payload) {
      failures.push({ itemIdentifier: record.messageId });
      continue;
    }
    try {
      await notifyOrderPaidEmails(payload);
    } catch (err) {
      console.error('[emailQueue] send failed', err);
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
}
