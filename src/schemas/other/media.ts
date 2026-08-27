import { z } from '@/utils/effectSchema.js';

/**
 * Input for the Media API image-upload tool (`ebay_upload_image`).
 *
 * Exactly one of `filePath`, `imageBase64`, or `externalPictureUrl` must be
 * provided. Paths are read at the MCP tool boundary, so they must be visible to
 * the server process (e.g. a container mount path, not a host path).
 */
export const uploadImageSchema = z.object({
  filePath: z
    .string()
    .optional()
    .describe(
      'Absolute path to a local image file to upload, readable by the server process (in Docker, a container-visible mount path such as /photos/front.jpg — NOT a host path).',
    ),
  imageBase64: z
    .string()
    .optional()
    .describe(
      'Base64-encoded image bytes, as an alternative to filePath (JPEG/PNG/GIF/BMP/TIFF/WebP).',
    ),
  externalPictureUrl: z
    .string()
    .optional()
    .describe(
      'Public HTTPS image URL for eBay to fetch, as an alternative to uploading local bytes.',
    ),
});
