import { CATALOG_TTL_SEC, KEY_PREFIX } from '../cache/constants.js';
import { cacheDel, getOrSet } from '../cache/store.js';
import { SITE_SETTINGS_ID, SiteSettingsModel } from '../models/SiteSettings.js';
import { getSocialLinkEnvDefault, normalizeSocialUrl, type SocialPlatform } from '../utils/socialLinks.js';
import { getSupportWhatsAppEnvDefault, normalizeIndianMobile } from '../utils/supportPhone.js';
import {
  DEFAULT_SHIPPING_CHARGE_PAISE,
  computeShippingPaise,
  normalizeFreeShippingMinPaise,
  normalizeShippingChargePaise,
  shippingConfigFromRow,
  type ShippingConfig,
} from '../utils/shipping.js';

export type SocialLinksPublic = {
  instagram: string | null;
  youtube: string | null;
  facebook: string | null;
};

export type SocialLinkMeta = {
  envDefault: string | null;
  stored: string | null;
  active: string | null;
  source: 'database' | 'env' | 'none';
};

export type SocialLinksMeta = Record<SocialPlatform, SocialLinkMeta>;

export type SiteSettingsPublic = {
  homeScrollAnimationEnabled: boolean;
  supportWhatsAppMobile: string;
  socialLinks: SocialLinksPublic;
  shipping: ShippingConfig;
};

export type ShippingMeta = {
  defaultChargePaise: number;
  storedChargePaise: number | null;
  storedFreeShippingMinPaise: number | null;
  active: ShippingConfig;
};

export type SupportWhatsAppMeta = {
  envDefault: string;
  stored: string | null;
  source: 'database' | 'env';
};

type SiteSettingsRow = {
  homeScrollAnimationEnabled?: boolean;
  supportWhatsAppMobile?: string;
  socialInstagramUrl?: string;
  socialYoutubeUrl?: string;
  socialFacebookUrl?: string;
  shippingChargePaise?: number;
  freeShippingMinPaise?: number;
};

const SITE_SETTINGS_CACHE_KEY = `${KEY_PREFIX}:site-settings:public`;

const SOCIAL_DB_KEYS: Record<SocialPlatform, keyof SiteSettingsRow> = {
  instagram: 'socialInstagramUrl',
  youtube: 'socialYoutubeUrl',
  facebook: 'socialFacebookUrl',
};

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

function resolveSocialLink(doc: SiteSettingsRow | null, platform: SocialPlatform): string | null {
  const dbKey = SOCIAL_DB_KEYS[platform];
  const storedRaw = doc?.[dbKey];
  const stored = typeof storedRaw === 'string' ? normalizeSocialUrl(storedRaw) : null;
  if (stored) return stored;
  return getSocialLinkEnvDefault(platform);
}

function socialLinkMeta(doc: SiteSettingsRow | null, platform: SocialPlatform): SocialLinkMeta {
  const dbKey = SOCIAL_DB_KEYS[platform];
  const storedRaw = doc?.[dbKey];
  const stored = typeof storedRaw === 'string' ? normalizeSocialUrl(storedRaw) : null;
  const envDefault = getSocialLinkEnvDefault(platform);
  const active = stored ?? envDefault;
  return {
    envDefault,
    stored,
    active,
    source: stored ? 'database' : envDefault ? 'env' : 'none',
  };
}

function socialLinksPublic(doc: SiteSettingsRow | null): SocialLinksPublic {
  return {
    instagram: resolveSocialLink(doc, 'instagram'),
    youtube: resolveSocialLink(doc, 'youtube'),
    facebook: resolveSocialLink(doc, 'facebook'),
  };
}

function socialLinksMeta(doc: SiteSettingsRow | null): SocialLinksMeta {
  return {
    instagram: socialLinkMeta(doc, 'instagram'),
    youtube: socialLinkMeta(doc, 'youtube'),
    facebook: socialLinkMeta(doc, 'facebook'),
  };
}

async function findSiteSettingsDoc(): Promise<SiteSettingsRow | null> {
  return await SiteSettingsModel.findById(SITE_SETTINGS_ID);
}

function toPublic(doc: SiteSettingsRow | null): SiteSettingsPublic {
  return {
    homeScrollAnimationEnabled: doc?.homeScrollAnimationEnabled === true,
    supportWhatsAppMobile: resolveSupportWhatsAppMobile(doc),
    socialLinks: socialLinksPublic(doc),
    shipping: shippingConfigFromRow(doc),
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
  socialLinks: SocialLinksMeta;
  shipping: ShippingMeta;
}> {
  const doc = await findSiteSettingsDoc();
  const active = shippingConfigFromRow(doc);
  return {
    settings: toPublic(doc),
    supportWhatsApp: supportWhatsAppMeta(doc),
    socialLinks: socialLinksMeta(doc),
    shipping: {
      defaultChargePaise: DEFAULT_SHIPPING_CHARGE_PAISE,
      storedChargePaise:
        doc?.shippingChargePaise === undefined || doc?.shippingChargePaise === null
          ? null
          : normalizeShippingChargePaise(doc.shippingChargePaise),
      storedFreeShippingMinPaise:
        doc?.freeShippingMinPaise === undefined || doc?.freeShippingMinPaise === null
          ? null
          : normalizeFreeShippingMinPaise(doc.freeShippingMinPaise),
      active,
    },
  };
}

export type SiteSettingsPatch = {
  homeScrollAnimationEnabled?: boolean;
  supportWhatsAppMobile?: string | null;
  socialInstagramUrl?: string | null;
  socialYoutubeUrl?: string | null;
  socialFacebookUrl?: string | null;
  shippingChargePaise?: number;
  freeShippingMinPaise?: number | null;
};

export { computeShippingPaise };

function applyNullableUrlPatch(
  patchValue: string | null | undefined,
  field: keyof SiteSettingsRow,
  $set: Record<string, unknown>,
  $unset: Record<string, ''>,
  label: string,
) {
  if (patchValue === undefined) return;
  if (patchValue === null || patchValue.trim() === '') {
    $unset[field] = '';
    return;
  }
  const normalized = normalizeSocialUrl(patchValue);
  if (!normalized) {
    throw new Error(`Invalid ${label} URL. Use a full https:// link.`);
  }
  $set[field] = normalized;
}

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

  applyNullableUrlPatch(patch.socialInstagramUrl, 'socialInstagramUrl', $set, $unset, 'Instagram');
  applyNullableUrlPatch(patch.socialYoutubeUrl, 'socialYoutubeUrl', $set, $unset, 'YouTube');
  applyNullableUrlPatch(patch.socialFacebookUrl, 'socialFacebookUrl', $set, $unset, 'Facebook');

  if (patch.shippingChargePaise !== undefined) {
    $set.shippingChargePaise = normalizeShippingChargePaise(patch.shippingChargePaise);
  }

  if (patch.freeShippingMinPaise !== undefined) {
    if (patch.freeShippingMinPaise === null) {
      $unset.freeShippingMinPaise = '';
    } else {
      $set.freeShippingMinPaise = normalizeFreeShippingMinPaise(patch.freeShippingMinPaise);
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
