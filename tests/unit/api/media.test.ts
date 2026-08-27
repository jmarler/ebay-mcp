import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { EbayApiClient } from '@/api/client.js';
import { MediaApi } from '@/api/other/media.js';
import { Effect } from 'effect';
import nock from 'nock';

const MEDIA_HOST = 'https://apim.ebay.com';
const BASE = '/commerce/media/v1_beta';

function createMockRestClient(environment = 'production') {
  const mockOAuthClient = {
    getAccessToken: vi.fn().mockReturnValue(Effect.succeed('mock_token')),
  };
  return {
    getConfig: vi.fn().mockReturnValue({ environment }),
    getOAuthClient: vi.fn().mockReturnValue(mockOAuthClient),
  } as unknown as EbayApiClient;
}

let media: MediaApi;

beforeEach(() => {
  vi.clearAllMocks();
  nock.cleanAll();
  nock.disableNetConnect();
  media = new MediaApi(createMockRestClient('production'));
});

afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

it('uploads bytes to the apim host and resolves the EPS url via getImage', async () => {
  // nock hands a binary multipart body to matchers as a hex string, so the
  // field name cannot be string-matched here; assert the multipart content-type
  // instead (the `image` field name is covered by the resolver/unit builder).
  const createScope = nock(MEDIA_HOST)
    .matchHeader('authorization', 'Bearer mock_token')
    .matchHeader('content-type', /^multipart\/form-data; boundary=/)
    .post(`${BASE}/image/create_image_from_file`)
    .reply(201, '', { Location: `${MEDIA_HOST}${BASE}/image/7799aa11` });

  const getScope = nock(MEDIA_HOST)
    .matchHeader('authorization', 'Bearer mock_token')
    .get(`${BASE}/image/7799aa11`)
    .reply(200, { imageUrl: 'https://i.ebayimg.com/images/g/abc/s-l1600.jpg' });

  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const result = await Effect.runPromise(media.createImageFromFile(bytes, 'front.jpg'));

  expect(result).toEqual({
    imageId: '7799aa11',
    imageUrl: 'https://i.ebayimg.com/images/g/abc/s-l1600.jpg',
  });
  createScope.done();
  getScope.done();
});

it('creates an image from a URL and resolves the EPS url', async () => {
  const createScope = nock(MEDIA_HOST)
    .post(`${BASE}/image/create_image_from_url`, { imageUrl: 'https://example.com/front.jpg' })
    .reply(201, '', { Location: `${MEDIA_HOST}${BASE}/image/abc123` });
  const getScope = nock(MEDIA_HOST)
    .get(`${BASE}/image/abc123`)
    .reply(200, { imageUrl: 'https://i.ebayimg.com/x.jpg' });

  const result = await Effect.runPromise(media.createImageFromUrl('https://example.com/front.jpg'));

  expect(result).toEqual({ imageId: 'abc123', imageUrl: 'https://i.ebayimg.com/x.jpg' });
  createScope.done();
  getScope.done();
});

it('fails when the create response has no Location header', async () => {
  nock(MEDIA_HOST).post(`${BASE}/image/create_image_from_file`).reply(201, '');

  const error = await Effect.runPromise(
    Effect.flip(media.createImageFromFile(Buffer.from([0xff, 0xd8, 0xff]))),
  );

  expect(error._tag).toBe('EbayApiError');
  expect(error.message).toMatch(/no Location header/i);
});

it('fails when getImage returns no imageUrl', async () => {
  nock(MEDIA_HOST)
    .post(`${BASE}/image/create_image_from_file`)
    .reply(201, '', { Location: `${MEDIA_HOST}${BASE}/image/noimg` });
  nock(MEDIA_HOST).get(`${BASE}/image/noimg`).reply(200, {});

  const error = await Effect.runPromise(
    Effect.flip(media.createImageFromFile(Buffer.from([0xff, 0xd8, 0xff]))),
  );

  expect(error._tag).toBe('EbayApiError');
  expect(error.message).toMatch(/no imageUrl/i);
});

it('targets the sandbox apim host when configured for sandbox', async () => {
  const sandboxMedia = new MediaApi(createMockRestClient('sandbox'));
  const scope = nock('https://apim.sandbox.ebay.com')
    .get(`${BASE}/image/s1`)
    .reply(200, { imageUrl: 'https://i.sandbox.ebayimg.com/s.jpg' });

  const result = await Effect.runPromise(sandboxMedia.getImage('s1'));

  expect(result.imageUrl).toBe('https://i.sandbox.ebayimg.com/s.jpg');
  scope.done();
});
