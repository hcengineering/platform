//
// Copyright © 2025 Hardcore Engineering Inc.
//

import { html, markdown, MarkupContent } from '../markup/types'

describe('MarkupContent', () => {
  describe('constructor', () => {
    it('should create MarkupContent with content and kind', () => {
      const content = '<p>Hello World</p>'
      const markup = new MarkupContent(content, 'html')

      expect(markup.content).toBe(content)
      expect(markup.kind).toBe('html')
    })

    it('should create MarkupContent with markdown kind', () => {
      const content = '# Hello World'
      const markup = new MarkupContent(content, 'markdown')

      expect(markup.content).toBe(content)
      expect(markup.kind).toBe('markdown')
    })

    it('should create MarkupContent with markup kind', () => {
      const content = 'plain markup content'
      const markup = new MarkupContent(content, 'markup')

      expect(markup.content).toBe(content)
      expect(markup.kind).toBe('markup')
    })
  })

  describe('html helper', () => {
    it('should create HTML MarkupContent', () => {
      const content = '<h1>Title</h1><p>Content</p>'
      const markup = html(content)

      expect(markup).toBeInstanceOf(MarkupContent)
      expect(markup.content).toBe(content)
      expect(markup.kind).toBe('html')
    })

    it('should handle empty HTML', () => {
      const markup = html('')

      expect(markup.content).toBe('')
      expect(markup.kind).toBe('html')
    })

    it('should handle complex HTML with attributes', () => {
      const content = '<div class="container"><a href="https://example.com">Link</a></div>'
      const markup = html(content)

      expect(markup.content).toBe(content)
      expect(markup.kind).toBe('html')
    })
  })

  describe('markdown helper', () => {
    it('should create Markdown MarkupContent', () => {
      const content = '# Heading\n\n* List item 1\n* List item 2'
      const markup = markdown(content)

      expect(markup).toBeInstanceOf(MarkupContent)
      expect(markup.content).toBe(content)
      expect(markup.kind).toBe('markdown')
    })

    it('should handle empty markdown', () => {
      const markup = markdown('')

      expect(markup.content).toBe('')
      expect(markup.kind).toBe('markdown')
    })

    it('should handle markdown with code blocks', () => {
      const content = '```javascript\nconst x = 42;\n```'
      const markup = markdown(content)

      expect(markup.content).toBe(content)
      expect(markup.kind).toBe('markdown')
    })

    it('should handle markdown with links', () => {
      const content = '[Link text](https://example.com)'
      const markup = markdown(content)

      expect(markup.content).toBe(content)
      expect(markup.kind).toBe('markdown')
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in content', () => {
      const content = '<p>Special chars: & < > " \'</p>'
      const markup = html(content)

      expect(markup.content).toBe(content)
    })

    it('should handle Unicode characters', () => {
      const content = '# 你好世界 🌍'
      const markup = markdown(content)

      expect(markup.content).toBe(content)
    })

    it('should handle very long content', () => {
      const content = 'a'.repeat(10000)
      const markup = html(content)

      expect(markup.content).toBe(content)
      expect(markup.content.length).toBe(10000)
    })

    it('should handle multiline content', () => {
      const content = 'Line 1\nLine 2\nLine 3'
      const markup = markdown(content)

      expect(markup.content).toBe(content)
    })
  })
})
