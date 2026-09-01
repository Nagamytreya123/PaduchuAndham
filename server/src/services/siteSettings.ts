import { CATALOG_TTL_SEC, KEY_PREFIX } from '../cache/constants.js';
import { cacheDel, getOrSet } from '../cache/store.js';
import { isDynamoDbEnabled } from '../db/dynamo/client.js';
import { SITE_SETTINGS_ID, SiteSettingsModel } from '../models/SiteSettings.js';

export type SiteSettingsPublic = {
  homeScrollAnimationEnabled: boolean;
};

type SiteSettingsRow = { homeScrollAnimationEnabled?: boolean };

const SITE_SETTINGS_CACHE_KEY = `${KEY_PREFIX}:site-settings:public`;

async function findSiteSettingsDoc(): Promise<SiteSettingsRow | null> {
  if (isDynamoDbEnabled()) {
    return await SiteSettingsModel.findById(SITE_SETTINGS_ID);
  }
  return await SiteSettingsModel.findById(SITE_SETTINGS_ID).lean();
}

function toPublic(doc: SiteSettingsRow | null): SiteSettingsPublic {
  if (!doc) {
    return { homeScrollAnimationEnabled: false };
  }
  return {
    homeScrollAnimationEnabled: doc.homeScrollAnimationEnabled === true,
  };
}

async function loadSiteSettingsFromDb(): Promise<SiteSettingsPublic> {
  const doc = await findSiteSettingsDoc();
  return toPublic(doc);
}

export async function getSiteSettings(): Promise<SiteSettingsPublic> {
  const { value } = await getOrSet(SITE_SETTINGS_CACHE_KEY, CATALOG_TTL_SEC, loadSiteSettingsFromDb);
  return value;
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

  await cacheDel(SITE_SETTINGS_CACHE_KEY);

  return {
    homeScrollAnimationEnabled: doc?.homeScrollAnimationEnabled === true,
  };
}
