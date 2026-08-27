import { EndpointInputError } from '@/api/shared/request.js';
import { uploadImageSchema } from '@/schemas/other/media.js';
import { defineTool } from '@/tools/defineTool.js';
import { resolveUploadImageInput } from '@/tools/media/uploadImageInput.js';
import type { ToolEntry } from '@/tools/registry.js';
import { Effect } from 'effect';

/**
 * Media API tools for uploading images to eBay Picture Services (EPS).
 *
 * This is the supported replacement for the Trading API UploadSiteHostedPictures
 * call (deprecated; decommissioned 2026-09-30). Gated as family `media`.
 */
export const mediaEntries: ToolEntry[] = [
  defineTool({
    name: 'ebay_upload_image',
    description:
      'Upload an image to eBay Picture Services (EPS) and return its hosted image ID and public URL (imageUrl), for use in listing images (Trading PictureDetails.PictureURL or Inventory imageUrls).\n\nUses the Media API (createImageFromFile / createImageFromUrl), the supported replacement for the deprecated Trading UploadSiteHostedPictures call. Provide exactly ONE of:\n- filePath: a path the SERVER can read. In Docker this must be a container-visible mount path (e.g. /photos/front.jpg), not a host path.\n- imageBase64: base64-encoded image bytes.\n- externalPictureUrl: a public HTTPS URL eBay will fetch.\n\nReturns { imageId, imageUrl }. Max 12 MB; formats JPG/GIF/PNG/BMP/TIFF/WebP.',
    inputSchema: uploadImageSchema.shape,
    handler: (api, args) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const resolved = yield* resolveUploadImageInput(args);
          if (resolved.imageBytes !== undefined) {
            return yield* api.media.createImageFromFile(resolved.imageBytes, resolved.fileName);
          }
          if (resolved.externalPictureUrl !== undefined) {
            return yield* api.media.createImageFromUrl(resolved.externalPictureUrl);
          }
          return yield* Effect.fail(
            new EndpointInputError({
              parameter: 'imageSource',
              message: 'Provide one of filePath, imageBase64, or externalPictureUrl',
            }),
          );
        }),
      ),
  }),
];
