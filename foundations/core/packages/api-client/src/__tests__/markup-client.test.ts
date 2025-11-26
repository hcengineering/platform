//
// Copyright © 2025 Hardcore Engineering Inc.
//

import { createMarkupOperations } from '../markup/client'
import { getClient } from '@hcengineering/collaborator-client'
import { makeCollabId } from '@hcengineering/core'

// Mock dependencies
jest.mock('@hcengineering/collaborator-client')
jest.mock('@hcengineering/text', () => ({
  htmlToJSON: jest.fn((html) => ({ type: 'doc', content: [{ type: 'text', text: html }] })),
  jsonToHTML: jest.fn((json) => json.content?.[0]?.text ?? ''),
  jsonToMarkup: jest.fn((json) => json.content?.[0]?.text ?? ''),
  markupToJSON: jest.fn((markup) => ({ type: 'doc', content: [{ type: 'text', text: markup }] }))
}))
jest.mock('@hcengineering/text-markdown', () => ({
  markdownToMarkup: jest.fn((md) => md),
  markupToMarkdown: jest.fn((json) => json.content?.[0]?.text ?? '')
}))

describe('MarkupOperations', () => {
  const mockConfig = {
    ACCOUNTS_URL: 'https://accounts.example.com',
    COLLABORATOR_URL: 'https://collaborator.example.com',
    FILES_URL: 'https://files.example.com',
    UPLOAD_URL: 'https://upload.example.com'
  }

  const workspace = 'test-workspace' as any
  const token = 'test-token'
  const url = 'https://api.example.com'

  let mockCollaborator: any
  let operations: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockCollaborator = {
      getMarkup: jest.fn(),
      createMarkup: jest.fn()
    }
    ;(getClient as jest.Mock).mockReturnValue(mockCollaborator)

    operations = createMarkupOperations(url, workspace, token, mockConfig)
  })

  describe('fetchMarkup', () => {
    const objectClass = 'class:test.Doc' as any
    const objectId = 'doc-id-123' as any
    const objectAttr = 'content'
    const markupRef = 'markup-ref-456' as any

    it('should fetch markup in markup format', async () => {
      const mockMarkup = 'Test markup content'
      mockCollaborator.getMarkup.mockResolvedValue(mockMarkup)

      const result = await operations.fetchMarkup(objectClass, objectId, objectAttr, markupRef, 'markup')

      const collabId = makeCollabId(objectClass, objectId, objectAttr)
      expect(mockCollaborator.getMarkup).toHaveBeenCalledWith(collabId, markupRef)
      expect(result).toBe(mockMarkup)
    })

    it('should fetch markup in HTML format', async () => {
      const mockMarkup = '<p>Test content</p>'
      mockCollaborator.getMarkup.mockResolvedValue(mockMarkup)

      const result = await operations.fetchMarkup(objectClass, objectId, objectAttr, markupRef, 'html')

      expect(mockCollaborator.getMarkup).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should fetch markup in markdown format', async () => {
      const mockMarkup = '# Test heading'
      mockCollaborator.getMarkup.mockResolvedValue(mockMarkup)

      const result = await operations.fetchMarkup(objectClass, objectId, objectAttr, markupRef, 'markdown')

      expect(mockCollaborator.getMarkup).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should throw error for unknown format', async () => {
      mockCollaborator.getMarkup.mockResolvedValue('content')

      await expect(
        operations.fetchMarkup(objectClass, objectId, objectAttr, markupRef, 'unknown-format' as any)
      ).rejects.toThrow('Unknown content format')
    })

    it('should handle collaborator errors', async () => {
      mockCollaborator.getMarkup.mockRejectedValue(new Error('Collaborator error'))

      await expect(operations.fetchMarkup(objectClass, objectId, objectAttr, markupRef, 'markup')).rejects.toThrow(
        'Collaborator error'
      )
    })
  })

  describe('uploadMarkup', () => {
    const objectClass = 'class:test.Doc' as any
    const objectId = 'doc-id-123' as any
    const objectAttr = 'content'
    const mockMarkupRef = 'new-markup-ref-789' as any

    beforeEach(() => {
      mockCollaborator.createMarkup.mockResolvedValue(mockMarkupRef)
    })

    it('should upload markup in markup format', async () => {
      const content = 'Test markup content'

      const result = await operations.uploadMarkup(objectClass, objectId, objectAttr, content, 'markup')

      const collabId = makeCollabId(objectClass, objectId, objectAttr)
      expect(mockCollaborator.createMarkup).toHaveBeenCalledWith(collabId, content)
      expect(result).toBe(mockMarkupRef)
    })

    it('should upload markup in HTML format', async () => {
      const content = '<p>Test HTML content</p>'

      const result = await operations.uploadMarkup(objectClass, objectId, objectAttr, content, 'html')

      expect(mockCollaborator.createMarkup).toHaveBeenCalled()
      expect(result).toBe(mockMarkupRef)
    })

    it('should upload markup in markdown format', async () => {
      const content = '# Test markdown'

      const result = await operations.uploadMarkup(objectClass, objectId, objectAttr, content, 'markdown')

      expect(mockCollaborator.createMarkup).toHaveBeenCalled()
      expect(result).toBe(mockMarkupRef)
    })

    it('should throw error for unknown format', async () => {
      await expect(
        operations.uploadMarkup(objectClass, objectId, objectAttr, 'content', 'unknown-format' as any)
      ).rejects.toThrow('Unknown content format')
    })

    it('should handle empty content', async () => {
      const result = await operations.uploadMarkup(objectClass, objectId, objectAttr, '', 'markup')

      const collabId = makeCollabId(objectClass, objectId, objectAttr)
      expect(mockCollaborator.createMarkup).toHaveBeenCalledWith(collabId, '')
      expect(result).toBe(mockMarkupRef)
    })

    it('should handle collaborator errors', async () => {
      mockCollaborator.createMarkup.mockRejectedValue(new Error('Upload failed'))

      await expect(operations.uploadMarkup(objectClass, objectId, objectAttr, 'content', 'markup')).rejects.toThrow(
        'Upload failed'
      )
    })
  })

  describe('initialization', () => {
    it('should initialize collaborator client with correct parameters', () => {
      expect(getClient).toHaveBeenCalledWith(workspace, token, mockConfig.COLLABORATOR_URL)
    })

    it('should handle different workspace IDs', () => {
      const differentWorkspace = 'different-workspace' as any
      createMarkupOperations(url, differentWorkspace, token, mockConfig)

      expect(getClient).toHaveBeenCalledWith(differentWorkspace, token, mockConfig.COLLABORATOR_URL)
    })

    it('should handle different tokens', () => {
      const differentToken = 'different-token'
      createMarkupOperations(url, workspace, differentToken, mockConfig)

      expect(getClient).toHaveBeenCalledWith(workspace, differentToken, mockConfig.COLLABORATOR_URL)
    })
  })
})
