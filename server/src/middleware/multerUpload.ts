import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { MAX_IMAGE_BYTES } from '../utils/productImageStorage.js';

export function multerErrorMessage(err: unknown): string {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return `Each image must be ${MAX_IMAGE_BYTES / (1024 * 1024)} MB or smaller`;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return 'Too many images in one request';
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Upload failed';
}

/** Wrap multer middleware so size/count errors return JSON 400 instead of HTML 500. */
export function withMulter(
  upload: ReturnType<typeof multer>,
  fields: { name: string; maxCount: number }[],
) {
  const handler = upload.fields(fields);
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: multerErrorMessage(err) });
        return;
      }
      next();
    });
  };
}

export function createImageUpload() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES },
  });
}
