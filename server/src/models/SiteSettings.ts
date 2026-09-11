import { createDynamoModel } from '../db/dynamo/client.js';

export const SITE_SETTINGS_ID = 'site';

export type SiteSettingsDoc = {
  _id: string;
  homeScrollAnimationEnabled?: boolean;
  supportWhatsAppMobile?: string;
  socialInstagramUrl?: string;
  socialYoutubeUrl?: string;
  socialFacebookUrl?: string;
  shippingChargePaise?: number;
  freeShippingMinPaise?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export const SiteSettingsModel = createDynamoModel('SiteSettings') as any;
