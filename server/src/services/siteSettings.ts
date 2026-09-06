import { CATALOG_TTL_SEC, KEY_PREFIX } from '../cache/constants.js';
import { cacheDel, getOrSet } from '../cache/store.js';
import { SITE_SETTINGS_ID, SiteSettingsModel } from '../models/SiteSettings.js';
import { getSupportWhatsAppEnvDefault, normalizeIndianMobile } from '../utils/supportPhone.js';

export type SiteSettingsPublic = {
  homeScrollAnimationEnabled: boolean;
  supportWhatsAppMobile: string;
};

export type SupportWhatsAppMeta = {
  envDefault: string;
  stored: string | null;
  source: 'database' | 'env';
};

type SiteSettingsRow = {
  homeScrollAnimationEnabled?: boolean;
  supportWhatsAppMobile?: string;
};

const SITE_SETTINGS_CACHE_KEY = `${KEY_PREFIX}:site-settings:public`;

function resolveSupportWhatsAppMobile(doc: SiteSettingsRow | null): string {
  const stored = doc?.supportWhatsAppMobile
    ? normalizeIndianMobile(doc.supportWhatsAppMobile)
    : null;
  if (stored) return stored;
  return getSupportWhatsAppEnvDefault();
}

function supportWhatsAppMeta(doc: SiteSettingsRow | null): SupportWhatsAppMeta {
  const stored = doc?.supportWhatsAppMobile
    ? normalizeIndianMobile(doc.supportWhatsAppMobile)
    : null;
  const envDefault = getSupportWhatsAppEnvDefault();
  return {
    envDefault,
    stored,
    source: stored ? 'database' : 'env',
  };
}

async function findSiteSettingsDoc(): Promise<SiteSettingsRow | null> {
  return await SiteSettingsModel.findById(SITE_SETTINGS_ID);
}

function toPublic(doc: SiteSettingsRow | null): SiteSettingsPublic {
  return {
    homeScrollAnimationEnabled: doc?.homeScrollAnimationEnabled === true,
    supportWhatsAppMobile: resolveSupportWhatsAppMobile(doc),
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

export async function getSiteSettingsCached(): Promise<{
  settings: SiteSettingsPublic;
  hit: boolean;
}> {
  const { value, hit } = await getOrSet(SITE_SETTINGS_CACHE_KEY, CATALOG_TTL_SEC, loadSiteSettingsFromDb);
  return { settings: value, hit };
}

export async function getAdminSiteSettings(): Promise<{
  settings: SiteSettingsPublic;
  supportWhatsApp: SupportWhatsAppMeta;
}> {
  const doc = await findSiteSettingsDoc();
  return {
    settings: toPublic(doc),
    supportWhatsApp: supportWhatsAppMeta(doc),
  };
}

export type SiteSettingsPatch = {
  homeScrollAnimationEnabled?: boolean;
  supportWhatsAppMobile?: string | null;
};

export async function updateSiteSettings(patch: SiteSettingsPatch): Promise<SiteSettingsPublic> {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ''> = {};

  if (patch.homeScrollAnimationEnabled !== undefined) {
    $set.homeScrollAnimationEnabled = patch.homeScrollAnimationEnabled;
  }

  if (patch.supportWhatsAppMobile !== undefined) {
    if (patch.supportWhatsAppMobile === null || patch.supportWhatsAppMobile.trim() === '') {
      $unset.supportWhatsAppMobile = '';
    } else {
      const normalized = normalizeIndianMobile(patch.supportWhatsAppMobile);
      if (!normalized) {
        throw new Error('Invalid WhatsApp number. Use a 10-digit Indian mobile number.');
      }
      $set.supportWhatsAppMobile = normalized;
    }
  }

  const update: Record<string, unknown> = {
    $setOnInsert: { _id: SITE_SETTINGS_ID },
  };
  if (Object.keys($set).length > 0) update.$set = $set;
  if (Object.keys($unset).length > 0) update.$unset = $unset;

  const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
  await SiteSettingsModel.findOneAndUpdate({ _id: SITE_SETTINGS_ID }, update, opts);
  await cacheDel(SITE_SETTINGS_CACHE_KEY);

  return await getSiteSettings();
}
