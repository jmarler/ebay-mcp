import { randomUUID } from 'node:crypto';
import type { EbayApiClient } from '@/api/client.js';
import { EbayApiError } from '@/api/shared/request.js';
import { getBaseUrl } from '@/config/environment.js';
import { getErrorMessage } from '@/utils/errors.js';
import { httpRequestEffect } from '@/utils/http.js';
import { Effect } from 'effect';

/** Base path for the eBay Media API (Limited-availability v1_beta). */
const MEDIA_BASE_PATH = '/commerce/media/v1_beta';

/** Media API multipart form field name for the binary image (per the OpenAPI spec). */
const IMAGE_FORM_FIELD = 'image';

const CRLF = '\r\n';

/** Result of uploading an image to eBay Picture Services (EPS) via the Media API. */
export interface UploadImageResult {
  /** EPS image ID, parsed from the create-image Location response header. */
  readonly imageId: string;
  /** Public EPS URL usable in Trading `PictureDetails.PictureURL` or Inventory `imageUrls`. */
  readonly imageUrl: string;
}

/** Response shape of Media API getImage — the EPS image metadata we surface. */
interface RawImageResponse {
  readonly imageUrl?: string;
}

/** Detect the image MIME type from the bytes' magic numbers, defaulting to JPEG. */
const sniffImageContentType = (data: Buffer): string => {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47
  ) {
    return 'image/png';
  }
  if (data.length >= 4 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    return 'image/gif';
  }
  if (
    data.length >= 12 &&
    data.toString('ascii', 0, 4) === 'RIFF' &&
    data.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (data.length >= 2 && data[0] === 0x42 && data[1] === 0x4d) {
    return 'image/bmp';
  }
  if (
    data.length >= 4 &&
    ((data[0] === 0x49 && data[1] === 0x49 && data[2] === 0x2a && data[3] === 0x00) ||
      (data[0] === 0x4d && data[1] === 0x4d && data[2] === 0x00 && data[3] === 0x2a))
  ) {
    return 'image/tiff';
  }
  return 'image/jpeg';
};

/** Strip characters that would break the multipart Content-Disposition filename. */
const sanitizeFileName = (fileName: string): string => {
  const cleaned = fileName.replace(/[\u0000-\u001f\u007f"\\]/g, '').trim();
  return cleaned.length > 0 ? cleaned : 'image.jpg';
};

/** Build a single-part multipart/form-data body with the image under field `image`. */
const buildImageMultipart = (
  boundary: string,
  bytes: Buffer,
  fileName: string,
  contentType: string,
): Buffer => {
  const head =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="${IMAGE_FORM_FIELD}"; filename="${sanitizeFileName(fileName)}"${CRLF}` +
    `Content-Type: ${contentType}${CRLF}${CRLF}`;
  const tail = `${CRLF}--${boundary}--${CRLF}`;
  return Buffer.concat([Buffer.from(head, 'utf8'), bytes, Buffer.from(tail, 'utf8')]);
};

/** Extract the EPS image ID from a create-image `Location` header URI. */
const imageIdFromLocation = (location: string | undefined): string | undefined => {
  if (!location) {
    return;
  }
  const trimmed = location.split(/[?#]/)[0].replace(/\/+$/, '');
  const id = trimmed.slice(trimmed.lastIndexOf('/') + 1);
  return id.length > 0 ? id : undefined;
};

/**
 * eBay Media API client for uploading images to eBay Picture Services (EPS).
 *
 * This is the supported replacement for the Trading API `UploadSiteHostedPictures`
 * call, which eBay has deprecated and scheduled for decommission on 2026-09-30.
 * The Media API is served from the `apim.ebay.com` host (not the usual
 * `api.ebay.com`) and authorizes with the `sell.inventory` OAuth scope. Uploading
 * is two hops: create the image (returns an image ID in the `Location` header),
 * then fetch its public EPS URL via getImage.
 *
 * @see https://developer.ebay.com/api-docs/commerce/media/resources/image/methods/createImageFromFile
 */
export class MediaApi {
  public constructor(private readonly client: EbayApiClient) {}

  /** Media API base URL for the configured environment (host swapped to `apim`). */
  private mediaBaseUrl(): string {
    const config = this.client.getConfig();
    const base = getBaseUrl(config.environment, config.apiBaseUrl);
    const host = base.includes('://api.') ? base.replace('://api.', '://apim.') : base;
    return `${host}${MEDIA_BASE_PATH}`;
  }

  /** Acquire an OAuth access token, mapping auth failures to EbayApiError. */
  private accessToken(path: string): Effect.Effect<string, EbayApiError> {
    return this.client
      .getOAuthClient()
      .getAccessToken()
      .pipe(
        Effect.mapError(
          (error) =>
            new EbayApiError({
              method: 'POST',
              path,
              cause: error,
            }),
        ),
      );
  }

  /**
   * Retrieves an EPS image's public URL by its image ID.
   *
   * @param imageId - EPS image ID returned by a create-image call.
   * @returns An Effect that succeeds with the EPS `imageUrl`.
   *
   * @example
   * ```ts
   * const { imageUrl } = await Effect.runPromise(mediaApi.getImage('123abc'));
   * ```
   *
   * @see https://developer.ebay.com/api-docs/commerce/media/resources/image/methods/getImage
   */
  public getImage = (imageId: string): Effect.Effect<RawImageResponse, EbayApiError> => {
    const url = `${this.mediaBaseUrl()}/image/${encodeURIComponent(imageId)}`;
    const acquireToken = this.accessToken(url);

    return Effect.gen(function* () {
      const token = yield* acquireToken;
      const response = yield* httpRequestEffect<RawImageResponse>({
        method: 'GET',
        url,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        responseType: 'json',
        timeoutMs: 30_000,
      }).pipe(
        Effect.mapError((error) => new EbayApiError({ method: 'GET', path: url, cause: error })),
      );
      return response.data ?? {};
    });
  };

  /** Resolve a create-image response (201 + Location) into id + EPS URL. */
  private resolveCreated = (
    location: string | undefined,
    path: string,
  ): Effect.Effect<UploadImageResult, EbayApiError> => {
    const getImage = this.getImage;
    return Effect.gen(function* () {
      const imageId = imageIdFromLocation(location);
      if (imageId === undefined) {
        return yield* Effect.fail(
          new EbayApiError({
            method: 'POST',
            path,
            cause: new Error('Media API create image succeeded but returned no Location header'),
          }),
        );
      }
      const image = yield* getImage(imageId);
      const imageUrl = image.imageUrl;
      if (typeof imageUrl !== 'string' || imageUrl.length === 0) {
        return yield* Effect.fail(
          new EbayApiError({
            method: 'GET',
            path: `${path}/${imageId}`,
            cause: new Error('Media API getImage returned no imageUrl'),
          }),
        );
      }
      return { imageId, imageUrl };
    });
  };

  /**
   * Uploads decoded image bytes to EPS via multipart/form-data and returns the
   * hosted image ID and public URL.
   *
   * @param imageBytes - Raw image bytes (JPEG/PNG/GIF/BMP/TIFF/WebP).
   * @param fileName - Optional original file name, used for the multipart part.
   * @returns An Effect that succeeds with the EPS image ID and URL.
   *
   * @example
   * ```ts
   * const { imageUrl } = await Effect.runPromise(
   *   mediaApi.createImageFromFile(bytes, 'front.jpg'),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/commerce/media/resources/image/methods/createImageFromFile
   */
  public createImageFromFile = (
    imageBytes: Buffer,
    fileName?: string,
  ): Effect.Effect<UploadImageResult, EbayApiError> => {
    const url = `${this.mediaBaseUrl()}/image/create_image_from_file`;
    const acquireToken = this.accessToken(url);
    const resolveCreated = this.resolveCreated;
    const boundary = `----ebayMcpMedia${randomUUID().replace(/-/g, '')}`;
    const body = buildImageMultipart(
      boundary,
      imageBytes,
      fileName ?? 'image.jpg',
      sniffImageContentType(imageBytes),
    );

    return Effect.gen(function* () {
      const token = yield* acquireToken;
      const response = yield* httpRequestEffect<string>({
        method: 'POST',
        url,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
        responseType: 'text',
        timeoutMs: 60_000,
      }).pipe(
        Effect.mapError((error) => new EbayApiError({ method: 'POST', path: url, cause: error })),
      );
      return yield* resolveCreated(response.headers.location, url);
    });
  };

  /**
   * Creates an EPS image from a publicly reachable HTTPS URL and returns the
   * hosted image ID and public URL.
   *
   * @param imageUrl - Public HTTPS URL of the source image for eBay to fetch.
   * @returns An Effect that succeeds with the EPS image ID and URL.
   *
   * @example
   * ```ts
   * const { imageUrl } = await Effect.runPromise(
   *   mediaApi.createImageFromUrl('https://example.com/front.jpg'),
   * );
   * ```
   *
   * @see https://developer.ebay.com/api-docs/commerce/media/resources/image/methods/createImageFromUrl
   */
  public createImageFromUrl = (
    imageUrl: string,
  ): Effect.Effect<UploadImageResult, EbayApiError> => {
    const url = `${this.mediaBaseUrl()}/image/create_image_from_url`;
    const acquireToken = this.accessToken(url);
    const resolveCreated = this.resolveCreated;

    return Effect.gen(function* () {
      const token = yield* acquireToken;
      const response = yield* httpRequestEffect<string>({
        method: 'POST',
        url,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: { imageUrl },
        responseType: 'text',
        timeoutMs: 30_000,
      }).pipe(
        Effect.mapError((error) => new EbayApiError({ method: 'POST', path: url, cause: error })),
      );
      return yield* resolveCreated(response.headers.location, url);
    });
  };
}
