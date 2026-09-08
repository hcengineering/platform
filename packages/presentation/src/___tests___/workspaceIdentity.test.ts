// Copyright © 2026 Huly Contributors. Licensed under the Eclipse Public License, Version 2.0.

import { mixLogoColor, normalizeIdentityColor, renderWorkspaceIdentity } from '../workspaceIdentity'

describe('workspace identification colour', () => {
  it('mixes colours in linear light', () => {
    expect(mixLogoColor(new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]))).toBe('#bc00bc')
  })

  it('ignores transparent padding and weights partially transparent pixels', () => {
    expect(mixLogoColor(new Uint8ClampedArray([255, 255, 255, 0, 0, 128, 255, 255]))).toBe('#0080ff')
    expect(mixLogoColor(new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 85]))).toBe('#e10089')
  })

  it('uses a stable fallback for empty or transparent images', () => {
    expect(mixLogoColor(new Uint8ClampedArray())).toBe('#64748b')
    expect(mixLogoColor(new Uint8ClampedArray([255, 0, 0, 0]))).toBe('#64748b')
  })

  it('normalizes manual choices and rejects malformed persisted values', () => {
    expect(normalizeIdentityColor(' #FF8800 ')).toBe('#ff8800')
    for (const value of [null, undefined, '', '#fff', 'red', '#12345678', 'url(x)']) {
      expect(normalizeIdentityColor(value)).toBeUndefined()
    }
  })
})

describe('optional workspace favicon', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = originalFetch })

  it('does not load images when both options are disabled', async () => {
    const fetchIcon = jest.fn()
    globalThis.fetch = fetchIcon
    await expect(renderWorkspaceIdentity('/workspace.png', null, undefined, {
      syncLogo: false, showColor: false
    })).resolves.toEqual({ color: '#64748b' })
    expect(fetchIcon).not.toHaveBeenCalled()
  })

  it('does not wait for a workspace logo when applying a manual badge to the site icon', async () => {
    const fetchIcon = jest.fn().mockRejectedValue(new Error('Site icon unavailable'))
    globalThis.fetch = fetchIcon
    await expect(renderWorkspaceIdentity('/workspace.png', '#ff8800', undefined, {
      syncLogo: false, showColor: true, defaultIconUrl: '/site.ico'
    })).rejects.toThrow('Site icon unavailable')
    expect(fetchIcon).toHaveBeenCalledTimes(1)
    expect(fetchIcon).toHaveBeenCalledWith('/site.ico', { signal: undefined })
  })

  it('falls back to the unchanged site favicon if the workspace logo is unavailable', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Workspace logo unavailable'))
    await expect(renderWorkspaceIdentity('/workspace.png', null, undefined, {
      syncLogo: true, showColor: false
    })).resolves.toEqual({ color: '#64748b' })
  })
})
