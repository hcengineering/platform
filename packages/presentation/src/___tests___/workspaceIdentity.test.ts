// Copyright © 2026 Huly Contributors. Licensed under the Eclipse Public License, Version 2.0.

import { mixLogoColor, normalizeIdentityColor, renderWorkspaceIdentity } from '../workspaceIdentity'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { runInNewContext } from 'vm'

describe('workspace favicon before application startup', () => {
  const icon = 'data:image/png;base64,iVBORw0KGgo='
  const template = readFileSync(resolve(__dirname, '../../../../dev/prod/src/index.ejs'), 'utf8')

  function bootstrap (pathname: string, cached?: string, denied = false): { fallback: any, icons: any[] } {
    const fallback = { href: '', dataset: { defaultHref: '/huly/favicon.ico' } }
    const icons: any[] = []
    const script = template.match(/<script id="workspace-favicon-bootstrap">([\s\S]*?)<\/script>/)?.[1]
    expect(script).toBeDefined()
    runInNewContext(script ?? '', {
      location: { pathname },
      localStorage: { getItem: (key: string) => {
        if (denied) throw new Error('Storage denied')
        return key === 'huly.workspace-favicon:/workbench/company-a' ? cached ?? null : null
      } },
      document: {
        getElementById: () => fallback,
        createElement: () => ({}),
        head: { appendChild: (link: any) => icons.push(link) }
      }
    })
    return { fallback, icons }
  }

  it('declares the cached PNG without assigning a fallback URL or starting the app', () => {
    const { fallback, icons } = bootstrap('/workbench/company-a/tracker', icon)
    expect(fallback.href).toBe('')
    expect(icons).toEqual([expect.objectContaining({ id: 'workspace-favicon', href: icon })])
  })

  it('never uses another workspace icon or applies one to the login page', () => {
    for (const pathname of ['/workbench/company-b', '/login']) {
      const { fallback, icons } = bootstrap(pathname, icon)
      expect(fallback.href).toBe('/huly/favicon.ico')
      expect(icons).toHaveLength(0)
    }
  })

  it('falls back safely when storage is denied or contains a non-PNG URL', () => {
    for (const cached of ['https://other.example/icon.png', 'javascript:alert(1)', 'broken']) {
      expect(bootstrap('/workbench/company-a', cached).fallback.href).toBe('/huly/favicon.ico')
    }
    expect(bootstrap('/workbench/company-a', icon, true).fallback.href).toBe('/huly/favicon.ico')
  })
})

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
