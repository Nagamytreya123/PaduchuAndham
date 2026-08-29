import { isDynamoDbEnabled } from '../db/dynamo/client.js';
import { SITE_SETTINGS_ID, SiteSettingsModel } from '../models/SiteSettings.js';

export type SiteSettingsPublic = {
  homeScrollAnimationEnabled: boolean;
};

type SiteSettingsRow = { homeScrollAnimationEnabled?: boolean };

async function findSiteSettingsDoc(): Promise<SiteSettingsRow | null> {
  if (isDynamoDbEnabled()) {
    return await SiteSettingsModel.findById(SITE_SETTINGS_ID);
  }
  return await SiteSettingsModel.findById(SITE_SETTINGS_ID).lean();
}

export async function getSiteSettings(): Promise<SiteSettingsPublic> {
  const doc = await findSiteSettingsDoc();
  if (!doc) {
    return { homeScrollAnimationEnabled: false };
  }
  return {
    homeScrollAnimationEnabled: doc.homeScrollAnimationEnabled === true,
  };
}

export async function updateSiteSettings(
  patch: Partial<SiteSettingsPublic>,
): Promise<SiteSettingsPublic> {
  const update = {
    $setOnInsert: { _id: SITE_SETTINGS_ID },
    $set: {
      ...(patch.homeScrollAnimationEnabled !== undefined
        ? { homeScrollAnimationEnabled: patch.homeScrollAnimationEnabled }
        : {}),
    },
  };
  const opts = { upsert: true, new: true, setDefaultsOnInsert: true };

  let doc: SiteSettingsRow | null;
  if (isDynamoDbEnabled()) {
    doc = await SiteSettingsModel.findOneAndUpdate({ _id: SITE_SETTINGS_ID }, update, opts);
  } else {
    doc = await SiteSettingsModel.findOneAndUpdate({ _id: SITE_SETTINGS_ID }, update, opts).lean();
  }

  return {
    homeScrollAnimationEnabled: doc?.homeScrollAnimationEnabled === true,
  };
}
