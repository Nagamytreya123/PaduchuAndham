import { env } from '../config/env.js';
import { normalizeExternalImageUrl } from './productImageStorage.js';
import { getS3PresignedUrlForUploadPath, isS3UploadsEnabled } from './s3Upload.js';

/** Keep presigned S3 links valid long enough for delayed email delivery. */
const EMAIL_IMAGE_PRESIGN_SEC = 7 * 24 * 60 * 60;

export type EmailImageAttachment = {
  cid: string;
  filename: string;
  content: Buffer;
  contentType: string;
};

export type ResolvedEmailImage = {
  src: string;
  attachment?: EmailImageAttachment;
};

function publicAssetBase(): string {
  return (env.SERVER_PUBLIC_URL ?? env.CLIENT_URL).replace(/\/$/, '');
}

function parseDataUri(dataUri: string): { buffer: Buffer; mime: string } | null {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match?.[1] || !match[2]) return null;
  try {
    return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
  } catch {
    return null;
  }
}

function extensionForMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('gif')) return 'gif';
  return 'webp';
}

/** Resolve a catalogue image for HTML email: embed data URIs, presign S3 uploads, keep direct https links. */
export async function resolveEmailImageUrl(
  raw: string | null | undefined,
  cidSeed: string,
): Promise<ResolvedEmailImage | null> {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();

  if (trimmed.startsWith('data:image/')) {
    const parsed = parseDataUri(trimmed);
    if (!parsed) return null;
    const cid = `order-img-${cidSeed}@paduchu`;
    const ext = extensionForMime(parsed.mime);
    return {
      src: `cid:${cid}`,
      attachment: {
        cid,
        filename: `product-${cidSeed}.${ext}`,
        content: parsed.buffer,
        contentType: parsed.mime,
      },
    };
  }

  if (trimmed.startsWith('/uploads/')) {
    if (isS3UploadsEnabled()) {
      const presigned = await getS3PresignedUrlForUploadPath(trimmed, EMAIL_IMAGE_PRESIGN_SEC);
      if (presigned) return { src: presigned };
    }
    return { src: `${publicAssetBase()}${trimmed}` };
  }

  const normalized = normalizeExternalImageUrl(trimmed);
  if (/^https?:\/\//i.test(normalized)) {
    return { src: normalized };
  }

  return null;
}

export async function resolveOrderItemImages(
  items: { imageRaw: string | null }[],
): Promise<{ imageSrcs: (string | null)[]; attachments: EmailImageAttachment[] }> {
  const attachments: EmailImageAttachment[] = [];
  const imageSrcs: (string | null)[] = [];

  for (let i = 0; i < items.length; i++) {
    const resolved = await resolveEmailImageUrl(items[i].imageRaw, String(i));
    if (!resolved) {
      imageSrcs.push(null);
      continue;
    }
    imageSrcs.push(resolved.src);
    if (resolved.attachment) attachments.push(resolved.attachment);
  }

  return { imageSrcs, attachments };
}
