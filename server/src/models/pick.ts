import { isDynamoDbEnabled, createDynamoModel } from '../db/dynamo/client.js';

export function pickModel(mongoModel: unknown, entityType: string): unknown {
  if (isDynamoDbEnabled()) {
    return createDynamoModel(entityType);
  }
  return mongoModel;
}
