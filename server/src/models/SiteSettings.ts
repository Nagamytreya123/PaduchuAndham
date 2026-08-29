import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { pickModel } from './pick.js';

export const SITE_SETTINGS_ID = 'site';

const siteSettingsSchema = new Schema(
  {
    _id: { type: String, default: SITE_SETTINGS_ID },
    /** Scroll-driven frame sequence + brand story block on the home page */
    homeScrollAnimationEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type SiteSettingsDoc = InferSchemaType<typeof siteSettingsSchema>;
const MongoSiteSettingsModel = mongoose.model('SiteSettings', siteSettingsSchema);
export const SiteSettingsModel = pickModel(MongoSiteSettingsModel, 'SiteSettings') as typeof MongoSiteSettingsModel;
