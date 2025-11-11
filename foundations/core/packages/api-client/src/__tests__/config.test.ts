//
// Copyright © 2025 Hardcore Engineering Inc.
//

import { loadServerConfig } from '../config'

describe('loadServerConfig', () => {
  const mockFetch = jest.fn()
  global.fetch = mockFetch as any

  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should load server config successfully', async () => {
    const mockConfig = {
      ACCOUNTS_URL: 'https://accounts.example.com',
      COLLABORATOR_URL: 'https://collaborator.example.com',
      FILES_URL: 'https://files.example.com',
      UPLOAD_URL: 'https://upload.example.com'
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockConfig
    })

    const config = await loadServerConfig('https://api.example.com')

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/config.json', { keepalive: true })
    expect(config).toEqual(mockConfig)
  })

  it('should throw error when fetch fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404
    })

    await expect(loadServerConfig('https://api.example.com')).rejects.toThrow('Failed to fetch config')
  })

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    await expect(loadServerConfig('https://api.example.com')).rejects.toThrow('Network error')
  })

  it('should construct correct config URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ACCOUNTS_URL: '',
        COLLABORATOR_URL: '',
        FILES_URL: '',
        UPLOAD_URL: ''
      })
    })

    await loadServerConfig('https://api.example.com/')
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/config.json', { keepalive: true })
  })

  it('should handle URL without trailing slash', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ACCOUNTS_URL: '',
        COLLABORATOR_URL: '',
        FILES_URL: '',
        UPLOAD_URL: ''
      })
    })

    await loadServerConfig('https://api.example.com')
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/config.json', { keepalive: true })
  })
})
