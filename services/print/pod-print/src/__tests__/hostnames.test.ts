// Copyright © 2026 Hardcore Engineering Inc.
import {
  getAllowedTargets,
  isAllowedLink,
  isAllowedRequest,
  isNavigationResourceType,
  isPrivateHostname,
  isUnexpectedTarget
} from '../hostnames'

describe('print link targets', () => {
  it('defaults to the front url origin when no hostnames are configured', () => {
    expect(getAllowedTargets([], 'https://huly.example.com/')).toEqual({
      origins: new Set(['https://huly.example.com']),
      hostnames: new Set()
    })
    expect(getAllowedTargets([''], 'http://front:8080')).toEqual({
      origins: new Set(['http://front:8080']),
      hostnames: new Set()
    })
  })

  it('uses configured hostnames when provided', () => {
    expect(getAllowedTargets([' a.example.com', 'B.example.com '], 'https://front.example.com')).toEqual({
      origins: new Set(),
      hostnames: new Set(['a.example.com', 'b.example.com'])
    })
  })

  it('allows nothing when neither hostnames nor a valid front url are configured', () => {
    const allowed = getAllowedTargets([], 'not a url')
    expect(allowed.origins.size).toBe(0)
    expect(allowed.hostnames.size).toBe(0)
    expect(isAllowedLink('https://huly.example.com/guest/ws', allowed)).toBe(false)
  })

  it('accepts only the front origin by default', () => {
    const allowed = getAllowedTargets([], 'http://huly.local:8087')
    expect(isAllowedLink('http://huly.local:8087/guest/ws?token=abc', allowed)).toBe(true)
    expect(isAllowedLink('http://HULY.local:8087/guest/ws', allowed)).toBe(true)
    expect(isAllowedLink('http://huly.local:9200/', allowed)).toBe(false)
    expect(isAllowedLink('http://huly.local/', allowed)).toBe(false)
    expect(isAllowedLink('https://huly.local:8087/', allowed)).toBe(false)
  })

  it('treats default ports as part of the front origin', () => {
    const allowed = getAllowedTargets([], 'https://huly.example.com')
    expect(isAllowedLink('https://huly.example.com:443/guest/ws', allowed)).toBe(true)
    expect(isAllowedLink('https://huly.example.com:8443/guest/ws', allowed)).toBe(false)
  })

  it('accepts any port of configured hostnames', () => {
    const allowed = getAllowedTargets(['huly.example.com'], 'https://front.example.com')
    expect(isAllowedLink('https://huly.example.com/guest/ws', allowed)).toBe(true)
    expect(isAllowedLink('http://huly.example.com:8080/guest/ws', allowed)).toBe(true)
    expect(isAllowedLink('https://front.example.com/guest/ws', allowed)).toBe(false)
  })

  it('rejects links to other hosts', () => {
    const allowed = getAllowedTargets([], 'https://huly.example.com')
    expect(isAllowedLink('http://169.254.169.254/latest/meta-data/', allowed)).toBe(false)
    expect(isAllowedLink('http://localhost:3000/', allowed)).toBe(false)
    expect(isAllowedLink('http://127.0.0.1/', allowed)).toBe(false)
    expect(isAllowedLink('https://huly.example.com.evil.test/', allowed)).toBe(false)
    expect(isAllowedLink('https://huly.example.com@evil.test/', allowed)).toBe(false)
  })

  it('rejects other protocols and invalid links', () => {
    const allowed = getAllowedTargets([], 'https://huly.example.com')
    expect(isAllowedLink('file:///etc/passwd', allowed)).toBe(false)
    expect(isAllowedLink('ftp://huly.example.com/', allowed)).toBe(false)
    expect(isAllowedLink('not a url', allowed)).toBe(false)
  })
})

describe('private hostnames', () => {
  it('detects localhost names', () => {
    expect(isPrivateHostname('localhost')).toBe(true)
    expect(isPrivateHostname('LOCALHOST.')).toBe(true)
    expect(isPrivateHostname('app.localhost')).toBe(true)
    expect(isPrivateHostname('localhost.example.com')).toBe(false)
  })

  it('detects private IPv4 addresses', () => {
    for (const host of [
      '127.0.0.1',
      '127.255.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254',
      '0.0.0.0',
      '100.64.0.1',
      '100.127.255.255',
      '192.0.0.1',
      '198.18.0.1',
      '224.0.0.1',
      '255.255.255.255'
    ]) {
      expect(isPrivateHostname(host)).toBe(true)
    }
    for (const host of [
      '8.8.8.8',
      '172.15.0.1',
      '172.32.0.1',
      '192.169.0.1',
      '169.255.0.1',
      '100.63.0.1',
      '100.128.0.1',
      '198.20.0.1',
      '223.255.255.255',
      '1.2.3'
    ]) {
      expect(isPrivateHostname(host)).toBe(false)
    }
  })

  it('detects private IPv6 addresses', () => {
    for (const host of ['[::1]', '[::]', '[fc00::1]', '[fd12:3456::1]', '[fe80::1]', '[FEBF::1]', '[fec0::1]', '[ff02::1]']) {
      expect(isPrivateHostname(host)).toBe(true)
    }
    for (const host of ['[2001:db8::1]', '[::ffff:8.8.8.8]', '[1:2:3:4:5:6:7:8:9]']) {
      expect(isPrivateHostname(host)).toBe(false)
    }
  })

  it('detects IPv4-mapped IPv6 addresses', () => {
    expect(isPrivateHostname('[::ffff:127.0.0.1]')).toBe(true)
    expect(isPrivateHostname('[::ffff:7f00:1]')).toBe(true)
    expect(isPrivateHostname('[::ffff:a9fe:a9fe]')).toBe(true)
    expect(isPrivateHostname('[::ffff:808:808]')).toBe(false)
  })

  it('detects alternative IPv4 notations after URL normalization', () => {
    for (const link of [
      'http://2130706433/',
      'http://0x7f.0.0.1/',
      'http://0177.0.0.1/',
      'http://127.1/',
      'http://0/',
      'http://[::ffff:127.0.0.1]/',
      'http://[0:0:0:0:0:0:0:1]/'
    ]) {
      expect(isPrivateHostname(new URL(link).hostname)).toBe(true)
    }
  })
})

describe('print requests', () => {
  const allowed = getAllowedTargets([], 'http://huly.local:8087')

  it('applies the link allowlist to navigations, including frames', () => {
    expect(isAllowedRequest('http://huly.local:8087/guest/ws', true, allowed)).toBe(true)
    expect(isAllowedRequest('http://huly.local:9200/', true, allowed)).toBe(false)
    expect(isAllowedRequest('https://www.example.com/embed', true, allowed)).toBe(false)
  })

  it('allows local data, blob and about requests', () => {
    expect(isAllowedRequest('data:image/png;base64,AAAA', false, allowed)).toBe(true)
    expect(isAllowedRequest('blob:http://huly.local:8087/1234', false, allowed)).toBe(true)
    expect(isAllowedRequest('about:blank', true, allowed)).toBe(true)
  })

  it('allows subresources from public hosts and the allowed targets', () => {
    expect(isAllowedRequest('https://cdn.example.com/image.png', false, allowed)).toBe(true)
    expect(isAllowedRequest('http://huly.local:8087/files/1', false, allowed)).toBe(true)
    expect(isAllowedRequest('http://huly.local:3000/', false, allowed)).toBe(true)
  })

  it('blocks subresources from private hosts outside of the allowed targets', () => {
    expect(isAllowedRequest('http://169.254.169.254/latest/meta-data/', false, allowed)).toBe(false)
    expect(isAllowedRequest('http://127.0.0.1:9200/', false, allowed)).toBe(false)
    expect(isAllowedRequest('http://localhost:3000/', false, allowed)).toBe(false)
    expect(isAllowedRequest('http://[::1]/', false, allowed)).toBe(false)
    expect(isAllowedRequest('http://2130706433/', false, allowed)).toBe(false)
    expect(isAllowedRequest('file:///etc/passwd', false, allowed)).toBe(false)
    expect(isAllowedRequest('not a url', false, allowed)).toBe(false)
  })

  it('allows private subresources on the front origin or configured hostnames', () => {
    const front = getAllowedTargets([], 'http://192.168.1.10:8087')
    expect(isAllowedRequest('http://192.168.1.10:8087/files/1', false, front)).toBe(true)
    expect(isAllowedRequest('ws://192.168.1.10:8087/_transactor', false, front)).toBe(true)
    expect(isAllowedRequest('http://192.168.1.10:9200/', false, front)).toBe(false)

    const configured = getAllowedTargets(['192.168.1.10'], 'http://front:8080')
    expect(isAllowedRequest('http://192.168.1.10:3000/', false, configured)).toBe(true)
    expect(isAllowedRequest('http://192.168.1.11:3000/', false, configured)).toBe(false)
  })

  it('treats document loads as navigations', () => {
    expect(isNavigationResourceType('Document')).toBe(true)
    expect(isNavigationResourceType('Script')).toBe(false)
    expect(isNavigationResourceType('XHR')).toBe(false)
    expect(isNavigationResourceType('Other')).toBe(false)
  })

  it('closes pages other than the rendered one', () => {
    expect(isUnexpectedTarget('page', true)).toBe(false)
    expect(isUnexpectedTarget('page', false)).toBe(true)
    expect(isUnexpectedTarget('background_page', false)).toBe(true)
    expect(isUnexpectedTarget('webview', false)).toBe(true)
    expect(isUnexpectedTarget('service_worker', false)).toBe(false)
    expect(isUnexpectedTarget('browser', false)).toBe(false)
  })
})
