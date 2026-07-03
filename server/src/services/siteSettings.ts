import { SITE_SETTINGS_ID, SiteSettingsModel } from '../models/SiteSettings.js';

export type SiteSettingsPublic = {
  homeScrollAnimationEnabled: boolean;
};

export async function getSiteSettings(): Promise<SiteSettingsPublic> {
  const doc = await SiteSettingsModel.findById(SITE_SETTINGS_ID).lean();
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
  const doc = await SiteSettingsModel.findOneAndUpdate(
    { _id: SITE_SETTINGS_ID },
    {
      $setOnInsert: { _id: SITE_SETTINGS_ID },
      $set: {
        ...(patch.homeScrollAnimationEnabled !== undefined
          ? { homeScrollAnimationEnabled: patch.homeScrollAnimationEnabled }
          : {}),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return {
    homeScrollAnimationEnabled: doc!.homeScrollAnimationEnabled === true,
  };
}
