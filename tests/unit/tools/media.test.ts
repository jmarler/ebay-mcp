import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import type { EbaySellerApi } from '@/api/index.js';
import { EndpointInputError } from '@/api/shared/request.js';
import { executeTool } from '@/tools/index.js';
import {
  MAX_BASE64_CHARS,
  MAX_IMAGE_BYTES,
  resolveUploadImageInput,
} from '@/tools/media/uploadImageInput.js';
import { Cause, Effect, Exit } from 'effect';
import process from 'node:process';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const createMediaApiMock = (): EbaySellerApi =>
  ({
    media: {
      createImageFromFile: vi.fn(),
      createImageFromUrl: vi.fn(),
    },
  }) as unknown as EbaySellerApi;

const expectUploadInputError = async (
  input: Parameters<typeof resolveUploadImageInput>[0],
): Promise<EndpointInputError> => {
  const exit = await Effect.runPromiseExit(resolveUploadImageInput(input));
  expect(Exit.isFailure(exit)).toBe(true);
  if (!Exit.isFailure(exit)) {
    throw new Error('expected the resolver to fail');
  }
  const error = Cause.squash(exit.cause);
  if (!(error instanceof EndpointInputError)) {
    throw new Error(`expected an EndpointInputError, got ${String(error)}`);
  }
  return error;
};

it('dispatches base64 input to createImageFromFile with decoded bytes', async () => {
  const api = createMediaApiMock();
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  vi.mocked(api.media.createImageFromFile).mockReturnValue(
    Effect.succeed({ imageId: '1', imageUrl: 'https://i.ebayimg.com/x.jpg' }),
  );

  await executeTool(api, 'ebay_upload_image', { imageBase64: bytes.toString('base64') });

  expect(api.media.createImageFromFile).toHaveBeenCalledWith(bytes, undefined);
  expect(api.media.createImageFromUrl).not.toHaveBeenCalled();
});

it('dispatches an external URL to createImageFromUrl', async () => {
  const api = createMediaApiMock();
  vi.mocked(api.media.createImageFromUrl).mockReturnValue(
    Effect.succeed({ imageId: '2', imageUrl: 'https://i.ebayimg.com/y.jpg' }),
  );

  await executeTool(api, 'ebay_upload_image', {
    externalPictureUrl: 'https://example.com/front.jpg',
  });

  expect(api.media.createImageFromUrl).toHaveBeenCalledWith('https://example.com/front.jpg');
  expect(api.media.createImageFromFile).not.toHaveBeenCalled();
});

it('dispatches a local file to createImageFromFile with its bytes and basename', async () => {
  const api = createMediaApiMock();
  const dir = await mkdtemp(join(tmpdir(), 'ebay-media-'));
  tempDirs.push(dir);
  const filePath = join(dir, 'front.jpg');
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x01, 0x02]);
  await writeFile(filePath, bytes);
  vi.mocked(api.media.createImageFromFile).mockReturnValue(
    Effect.succeed({ imageId: '3', imageUrl: 'https://i.ebayimg.com/z.jpg' }),
  );

  await executeTool(api, 'ebay_upload_image', { filePath });

  expect(api.media.createImageFromFile).toHaveBeenCalledTimes(1);
  const [passedBytes, passedName] = vi.mocked(api.media.createImageFromFile).mock.calls[0];
  expect(Buffer.from(passedBytes as Buffer)).toEqual(bytes);
  expect(passedName).toBe('front.jpg');
});

it('rejects a request with no image source', async () => {
  const error = await expectUploadInputError({});
  expect(error.parameter).toBe('imageSource');
  expect(error.message).toMatch(/provide one of/i);
});

it('rejects a request with multiple image sources', async () => {
  const error = await expectUploadInputError({
    filePath: '/photos/front.jpg',
    externalPictureUrl: 'https://example.com/photo.jpg',
  });
  expect(error.parameter).toBe('imageSource');
  expect(error.message).toMatch(/only one of/i);
});

it('rejects invalid base64', async () => {
  const error = await expectUploadInputError({ imageBase64: 'not valid base64 @@@' });
  expect(error.parameter).toBe('imageBase64');
  expect(error.message).toMatch(/not valid base64/i);
});

it('rejects oversized base64 before decoding', async () => {
  const error = await expectUploadInputError({ imageBase64: 'A'.repeat(MAX_BASE64_CHARS + 1) });
  expect(error.parameter).toBe('imageBase64');
  expect(error.message).toMatch(/too large/i);
});

it('reports a filePath error when the file does not exist', async () => {
  const error = await expectUploadInputError({ filePath: '/nonexistent/path/front.jpg' });
  expect(error.parameter).toBe('filePath');
  expect(error.message).toMatch(/failed to read image file/i);
});

it('rejects a file larger than the size cap', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ebay-media-big-'));
  tempDirs.push(dir);
  const filePath = join(dir, 'huge.jpg');
  await writeFile(filePath, Buffer.alloc(MAX_IMAGE_BYTES + 16));

  const error = await expectUploadInputError({ filePath });
  expect(error.parameter).toBe('filePath');
  expect(error.message).toMatch(/over the .* limit/i);
});

// /dev/null is a POSIX character device; Windows has no equivalent path.
it.skipIf(process.platform === 'win32')('rejects a non-regular file', async () => {
  const error = await expectUploadInputError({ filePath: '/dev/null' });
  expect(error.parameter).toBe('filePath');
  expect(error.message).toMatch(/not a regular file/i);
});
