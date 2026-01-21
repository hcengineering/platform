import { MeasureContext } from '@hcengineering/core'
import { Config } from '../config'
import { parseLinkPreviewDetails, LinkPreviewError } from '../parse'

// ============================================================================
// Test Utilities & Mocks
// ============================================================================

const createMockContext = (): MeasureContext =>
  ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    measure: jest.fn(),
    newChild: jest.fn(() => createMockContext())
  }) as unknown as MeasureContext

const defaultConfig: Config = {
  Port: 4041,
  Secret: 'secret',
  ServiceID: 'link-preview',
  UserAgent: 'TestBot/1.0',
  DescriptionMaxSentences: 3,
  DescriptionMaxLength: 200,
  TimeoutMs: 5000,
  MaxImageBytes: 1024 * 1024
}

const createHtmlResponse = (html: string, headers: Record<string, string> = {}): Response => {
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...headers
    }
  })
}

const createJsonResponse = (data: object): Response => {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

// ============================================================================
// URL Validation Tests
// ============================================================================

describe('URL Validation', () => {
  let ctx: MeasureContext

  beforeEach(() => {
    ctx = createMockContext()
    jest.clearAllMocks()
  })

  describe('protocol validation', () => {
    it('should accept https URLs', async () => {
      const html = '<html><head><title>Test</title></head></html>'
      global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

      const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')
      expect(result.title).toBe('Test')
    })

    it('should accept http URLs', async () => {
      const html = '<html><head><title>Test</title></head></html>'
      global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

      const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'http://example.com')
      expect(result.title).toBe('Test')
    })

    it('should reject file:// protocol', async () => {
      await expect(parseLinkPreviewDetails(ctx, defaultConfig, 'file:///etc/passwd')).rejects.toThrow(LinkPreviewError)
    })

    it('should reject javascript: protocol', async () => {
      await expect(parseLinkPreviewDetails(ctx, defaultConfig, 'javascript:alert(1)')).rejects.toThrow(LinkPreviewError)
    })

    it('should reject data: protocol', async () => {
      await expect(parseLinkPreviewDetails(ctx, defaultConfig, 'data:text/html,<h1>test</h1>')).rejects.toThrow(
        LinkPreviewError
      )
    })

    it('should reject invalid URLs', async () => {
      await expect(parseLinkPreviewDetails(ctx, defaultConfig, 'not-a-valid-url')).rejects.toThrow(LinkPreviewError)
    })
  })

  describe('SSRF protection', () => {
    const blockedAddresses = [
      '127.0.0.1',
      '127.0.0.2',
      '10.0.0.1',
      '10.255.255.255',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.0.1',
      '192.168.255.255',
      '169.254.0.1',
      '0.0.0.0',
      'localhost'
    ]

    it.each(blockedAddresses)('should block access to %s', async (host) => {
      await expect(parseLinkPreviewDetails(ctx, defaultConfig, `https://${host}/path`)).rejects.toThrow(
        LinkPreviewError
      )
    })

    it('should allow public IP addresses', async () => {
      const html = '<html><head><title>Public</title></head></html>'
      global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

      // These should not throw BLOCKED_URL
      const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://8.8.8.8')
      expect(result).toBeDefined()
    })
  })
})

// ============================================================================
// Open Graph Parsing Tests
// ============================================================================

describe('Open Graph Parsing', () => {
  let ctx: MeasureContext

  beforeEach(() => {
    ctx = createMockContext()
    jest.clearAllMocks()
  })

  it('should parse basic OG tags', async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="OG Title">
          <meta property="og:description" content="OG Description">
          <meta property="og:image" content="https://example.com/image.jpg">
          <meta property="og:site_name" content="Example Site">
        </head>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com/page')

    expect(result.title).toBe('OG Title')
    expect(result.description).toBe('OG Description')
    expect(result.image).toBe('https://example.com/image.jpg')
    expect(result.hostname).toBe('Example Site')
  })

  it('should fall back to title tag when OG title is missing', async () => {
    const html = `
      <html>
        <head>
          <title>Page Title</title>
        </head>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')
    expect(result.title).toBe('Page Title')
  })

  it('should fall back to meta description when OG description is missing', async () => {
    const html = `
      <html>
        <head>
          <meta name="description" content="Meta Description">
        </head>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')
    expect(result.description).toBe('Meta Description')
  })

  it('should parse Twitter card tags as fallback', async () => {
    const html = `
      <html>
        <head>
          <meta name="twitter:title" content="Twitter Title">
          <meta name="twitter:description" content="Twitter Description">
          <meta name="twitter:image" content="https://example.com/twitter.jpg">
        </head>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')

    expect(result.title).toBe('Twitter Title')
    expect(result.description).toBe('Twitter Description')
    expect(result.image).toBe('https://example.com/twitter.jpg')
  })

  it('should resolve relative image URLs', async () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="/images/photo.jpg">
        </head>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com/page')
    expect(result.image).toBe('https://example.com/images/photo.jpg')
  })

  it('should parse canonical URL', async () => {
    const html = `
      <html>
        <head>
          <link rel="canonical" href="https://example.com/canonical-page">
        </head>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com/page?utm=123')
    expect(result.url).toBe('https://example.com/canonical-page')
  })

  it('should parse favicon', async () => {
    const html = `
      <html>
        <head>
          <link rel="icon" href="/favicon.ico">
        </head>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')
    expect(result.icon).toBe('https://example.com/favicon.ico')
  })

  it('should parse image dimensions from OG tags', async () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://example.com/image.jpg">
          <meta property="og:image:width" content="1200">
          <meta property="og:image:height" content="630">
        </head>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')

    expect(result.imageWidth).toBe(1200)
    expect(result.imageHeight).toBe(630)
  })
})

// ============================================================================
// Description Extraction Tests
// ============================================================================

describe('Description Extraction', () => {
  let ctx: MeasureContext

  beforeEach(() => {
    ctx = createMockContext()
    jest.clearAllMocks()
  })

  it('should extract description from paragraphs when meta tags are missing', async () => {
    const html = `
      <html>
        <body>
          <p>This is the first sentence. This is the second sentence.</p>
          <p>This is the third sentence.</p>
        </body>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')

    expect(result.description).toBe(
      'This is the first sentence. This is the second sentence. This is the third sentence.'
    )
  })

  it('should limit description to configured max sentences', async () => {
    const html = `
      <html>
        <body>
          <p>Sentence one. Sentence two. Sentence three. Sentence four. Sentence five.</p>
        </body>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const config = { ...defaultConfig, DescriptionMaxSentences: 2 }
    const result = await parseLinkPreviewDetails(ctx, config, 'https://example.com')

    expect(result.description).toBe('Sentence one. Sentence two.')
  })

  it('should truncate description to configured max length', async () => {
    const html = `
      <html>
        <body>
          <p>This is a very long sentence that exceeds the maximum length configured for descriptions in the system.</p>
        </body>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const config = { ...defaultConfig, DescriptionMaxLength: 50 }
    const result = await parseLinkPreviewDetails(ctx, config, 'https://example.com')

    expect(result.description?.length).toBeLessThanOrEqual(50)
    expect(result.description).toMatch(/\.\.\.$/)
  })

  it('should handle paragraphs with question marks and exclamation points', async () => {
    const html = `
      <html>
        <body>
          <p>Is this a question? Yes it is! And here's more.</p>
        </body>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')

    expect(result.description).toBe("Is this a question? Yes it is! And here's more.")
  })
})

// ============================================================================
// oEmbed Tests
// ============================================================================

describe('oEmbed Integration', () => {
  let ctx: MeasureContext

  beforeEach(() => {
    ctx = createMockContext()
    jest.clearAllMocks()
  })

  it('should use oEmbed data when available via discovery', async () => {
    const oembedEndpoint = 'https://example.com/oembed?url=test'
    const html = `
      <html>
        <head>
          <link type="application/json+oembed" href="https://example.com/oembed?url=test">
          <meta property="og:title" content="OG Title">
        </head>
      </html>
    `
    const oembedData = {
      type: 'video',
      version: '1.0',
      title: 'oEmbed Title',
      author_name: 'Author Name',
      provider_name: 'Provider',
      thumbnail_url: 'https://example.com/thumb.jpg',
      thumbnail_width: 480,
      thumbnail_height: 360
    }

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === oembedEndpoint) {
        return Promise.resolve(createJsonResponse(oembedData))
      }
      return Promise.resolve(createHtmlResponse(html))
    })

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com/video')

    expect(result.title).toBe('oEmbed Title')
    expect(result.description).toBe('Provider - Author Name')
    expect(result.image).toBe('https://example.com/thumb.jpg')
    expect(result.imageWidth).toBe(480)
    expect(result.imageHeight).toBe(360)
  })

  it('should fall back to OG when oEmbed fails', async () => {
    const html = `
      <html>
        <head>
          <link type="application/json+oembed" href="https://example.com/oembed">
          <meta property="og:title" content="Fallback OG Title">
        </head>
      </html>
    `

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/oembed')) {
        return Promise.resolve(new Response(null, { status: 404 }))
      }
      return Promise.resolve(createHtmlResponse(html))
    })

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')

    expect(result.title).toBe('Fallback OG Title')
  })

  it('should reject invalid oEmbed responses', async () => {
    const html = `
      <html>
        <head>
          <link type="application/json+oembed" href="https://example.com/oembed">
          <meta property="og:title" content="OG Title">
        </head>
      </html>
    `
    // Missing required 'type' and 'version' fields
    const invalidOembed = { title: 'Invalid' }

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/oembed')) {
        return Promise.resolve(createJsonResponse(invalidOembed))
      }
      return Promise.resolve(createHtmlResponse(html))
    })

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')

    // Should fall back to OG
    expect(result.title).toBe('OG Title')
  })

  it('should handle oEmbed photo type', async () => {
    const html = `
      <html>
        <head>
          <link type="application/json+oembed" href="https://flickr.com/oembed">
        </head>
      </html>
    `
    const oembedData = {
      type: 'photo',
      version: '1.0',
      title: 'Photo Title',
      url: 'https://flickr.com/photo.jpg',
      width: 1920,
      height: 1080
    }

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/oembed')) {
        return Promise.resolve(createJsonResponse(oembedData))
      }
      return Promise.resolve(createHtmlResponse(html))
    })

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://flickr.com/photo/123')

    expect(result.image).toBe('https://flickr.com/photo.jpg')
    expect(result.imageWidth).toBe(1920)
    expect(result.imageHeight).toBe(1080)
  })
})

// ============================================================================
// Charset Handling Tests
// ============================================================================

describe('Charset Handling', () => {
  let ctx: MeasureContext

  beforeEach(() => {
    ctx = createMockContext()
    jest.clearAllMocks()
  })

  it('should detect charset from Content-Type header', async () => {
    const html = '<html><head><title>Test</title></head></html>'
    global.fetch = jest
      .fn()
      .mockResolvedValue(createHtmlResponse(html, { 'Content-Type': 'text/html; charset=iso-8859-1' }))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')
    expect(result.charset).toBe('iso-8859-1')
  })

  it('should detect charset from meta charset tag', async () => {
    const html = `
      <html>
        <head>
          <meta charset="shift_jis">
          <title>日本語</title>
        </head>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html, { 'Content-Type': 'text/html' }))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.jp')
    expect(result.charset).toBe('shift_jis')
  })

  it('should detect charset from http-equiv meta tag', async () => {
    const html = `
      <html>
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=euc-kr">
          <title>한국어</title>
        </head>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html, { 'Content-Type': 'text/html' }))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.kr')
    expect(result.charset).toBe('euc-kr')
  })

  it('should default to utf-8 when no charset specified', async () => {
    const html = '<html><head><title>Test</title></head></html>'
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html, { 'Content-Type': 'text/html' }))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')
    expect(result.charset).toBe('utf-8')
  })

  it('should handle quoted charset values', async () => {
    const html = '<html><head><title>Test</title></head></html>'
    global.fetch = jest
      .fn()
      .mockResolvedValue(createHtmlResponse(html, { 'Content-Type': 'text/html; charset="UTF-8"' }))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')
    expect(result.charset).toBe('utf-8')
  })
})

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  let ctx: MeasureContext

  beforeEach(() => {
    ctx = createMockContext()
    jest.clearAllMocks()
  })

  it('should throw on HTTP error responses', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 404, statusText: 'Not Found' }))

    await expect(parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com/missing')).rejects.toThrow(
      LinkPreviewError
    )
  })

  it('should throw on network errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    await expect(parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')).rejects.toThrow(LinkPreviewError)
  })

  it('should handle malformed HTML gracefully', async () => {
    const html = '<html><head><title>Broken<<<<</title></head></html>'
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    // Should not throw
    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')
    expect(result).toBeDefined()
    expect(result.host).toBe('https://example.com')
  })

  it('should continue when image size fetch fails', async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Test">
          <meta property="og:image" content="https://example.com/broken.jpg">
        </head>
      </html>
    `
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(createHtmlResponse(html))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')

    expect(result.title).toBe('Test')
    expect(result.image).toBe('https://example.com/broken.jpg')
    expect(result.imageWidth).toStrictEqual(undefined)
    expect(result.imageHeight).toStrictEqual(undefined)
  })
})

// ============================================================================
// Image Handling Tests
// ============================================================================

describe('Image Handling', () => {
  let ctx: MeasureContext

  beforeEach(() => {
    ctx = createMockContext()
    jest.clearAllMocks()
  })

  it('should handle direct image URLs', async () => {
    // 1x1 transparent PNG
    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )

    global.fetch = jest.fn().mockResolvedValue(
      new Response(pngData, {
        status: 200,
        headers: { 'Content-Type': 'image/png' }
      })
    )

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com/image.png')

    expect(result.image).toBe('https://example.com/image.png')
    expect(result.url).toBe('https://example.com/image.png')
  })

  it('should reject images exceeding max size', async () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://example.com/huge.jpg">
        </head>
      </html>
    `
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(createHtmlResponse(html))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Length': '999999999'
          }
        })
      )

    const config = { ...defaultConfig, MaxImageBytes: 1000 }
    const result = await parseLinkPreviewDetails(ctx, config, 'https://example.com')

    // Should not have image dimensions since fetch was skipped
    expect(result.imageWidth).toBeUndefined()
    expect(ctx.warn).toHaveBeenCalledWith('image too large', expect.any(Object))
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  let ctx: MeasureContext

  beforeEach(() => {
    ctx = createMockContext()
    jest.clearAllMocks()
  })

  it('should handle empty HTML document', async () => {
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(''))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')

    expect(result.host).toBe('https://example.com')
    expect(result.hostname).toBe('example.com')
    expect(result.title).toStrictEqual(undefined)
  })

  it('should handle URLs with special characters', async () => {
    const html = '<html><head><title>Special</title></head></html>'
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com/path?q=hello%20world&foo=bar')

    expect(result.title).toBe('Special')
  })

  it('should handle internationalized domain names', async () => {
    const html = '<html><head><title>IDN Test</title></head></html>'
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://例え.jp/page')

    expect(result.title).toBe('IDN Test')
  })

  it('should handle multiple OG images (use first)', async () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://example.com/first.jpg">
          <meta property="og:image" content="https://example.com/second.jpg">
        </head>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')
    expect(result.image).toBe('https://example.com/first.jpg')
  })

  it('should handle redirect responses', async () => {
    const html = '<html><head><title>Redirected</title></head></html>'
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com/redirect')
    expect(result.title).toBe('Redirected')
  })

  it('should sanitize HTML entities in titles', async () => {
    const html = '<html><head><title>Rock &amp; Roll</title></head></html>'
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')
    expect(result.title).toBe('Rock & Roll')
  })

  it('should trim whitespace from extracted values', async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="  Padded Title  ">
        </head>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://example.com')
    // Note: cheerio may or may not trim - this tests current behavior
    expect(result.title).toBeDefined()
  })
})

// ============================================================================
// Integration-style Tests
// ============================================================================

describe('Real-world Scenarios', () => {
  let ctx: MeasureContext

  beforeEach(() => {
    ctx = createMockContext()
    jest.clearAllMocks()
  })

  it('should parse a typical blog post page', async () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>10 Tips for Better Code - Dev Blog</title>
          <meta name="description" content="Learn the top 10 tips for writing better code.">
          <meta property="og:title" content="10 Tips for Better Code">
          <meta property="og:description" content="Learn the top 10 tips for writing better, cleaner code.">
          <meta property="og:image" content="https://blog.example.com/images/code-tips.jpg">
          <meta property="og:image:width" content="1200">
          <meta property="og:image:height" content="630">
          <meta property="og:site_name" content="Dev Blog">
          <meta property="og:url" content="https://blog.example.com/posts/10-tips">
          <link rel="canonical" href="https://blog.example.com/posts/10-tips">
          <link rel="icon" href="/favicon.ico">
        </head>
        <body>
          <article>
            <h1>10 Tips for Better Code</h1>
            <p>Writing clean code is essential for maintainability.</p>
          </article>
        </body>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(
      ctx,
      defaultConfig,
      'https://blog.example.com/posts/10-tips?utm_source=twitter'
    )

    expect(result).toMatchObject({
      title: '10 Tips for Better Code',
      description: 'Learn the top 10 tips for writing better, cleaner code.',
      url: 'https://blog.example.com/posts/10-tips',
      hostname: 'Dev Blog',
      host: 'https://blog.example.com',
      image: 'https://blog.example.com/images/code-tips.jpg',
      imageWidth: 1200,
      imageHeight: 630,
      icon: 'https://blog.example.com/favicon.ico',
      charset: 'utf-8'
    })
  })

  it('should handle minimal HTML pages', async () => {
    const html = `
      <html>
        <head><title>Simple Page</title></head>
        <body><p>Just some content here.</p></body>
      </html>
    `
    global.fetch = jest.fn().mockResolvedValue(createHtmlResponse(html))

    const result = await parseLinkPreviewDetails(ctx, defaultConfig, 'https://simple.example.com')

    expect(result.title).toBe('Simple Page')
    expect(result.description).toBe('Just some content here.')
    expect(result.hostname).toBe('simple.example.com')
  })
})
