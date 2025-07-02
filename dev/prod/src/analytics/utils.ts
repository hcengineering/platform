import { UAParser } from 'ua-parser-js'

const parser = UAParser()

function getUrlTrackingParams () {
  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content'),
    gclid: params.get('gclid'),
    gad_source: params.get('gad_source'),
    gclsrc: params.get('gclsrc'),
    dclid: params.get('dclid'),
    wbraid: params.get('wbraid'),
    gbraid: params.get('gbraid'),
    fbclid: params.get('fbclid'),
    msclkid: params.get('msclkid'),
    twclid: params.get('twclid'),
    li_fat_id: params.get('li_fat_id'),
    mc_cid: params.get('mc_cid'),
    igshid: params.get('igshid'),
    ttclid: params.get('ttclid')
  }
}

function getSearchEngine (referrer: string) {
  if (!referrer) return null
  const domains = {
    "google.": "google",
    "bing.": "bing",
    "yahoo.": "yahoo",
    "duckduckgo.": "duckduckgo",
    "yandex.": "yandex"
  }
  for (const [domain, engine] of Object.entries(domains)) {
    if (referrer.includes(domain)) return engine
  }
  return null
}

function getDeviceType (type: string) {
  if (!type) return 'Desktop'
  if (type === 'mobile') return 'Mobile'
  if (type === 'tablet') return 'Tablet'
  return 'Desktop'
}

export function collectEventMetadata (properties: Record<string, any> = {}, eventName?: string) {
  const trackingParams = getUrlTrackingParams()
  const referrer = document.referrer === '' ? '$direct' : document.referrer
  const referringDomain = referrer !== '$direct' ? new URL(referrer).hostname : '$direct'

  const now = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const timezoneOffset = -now.getTimezoneOffset()

  return {
    event: eventName,
    properties: {
      ...properties,
      $timestamp: new Date().toISOString(),
      $os: parser.os.name || 'Unknown OS',
      $os_version: parser.os.version || '',
      $browser: parser.browser.name || 'Unknown Browser',
      $browser_version: parseInt(parser.browser.major ?? '0', 10),
      $device_type: getDeviceType(parser.device.type),
      $current_url: window.location.href,
      $host: window.location.hostname,
      $pathname: window.location.pathname,
      $screen_height: window.screen.height,
      $screen_width: window.screen.width,
      $viewport_height: window.innerHeight,
      $viewport_width: window.innerWidth,
      $lib: 'web',
      $lib_version: '1.31.0',
      $search_engine: getSearchEngine(referrer),
      $referrer: referrer,
      $referring_domain: referringDomain,
      $raw_user_agent: navigator.userAgent,
      title: document.title,
      $timezone: timezone,
      $timezone_offset: timezoneOffset,
      ...trackingParams
    }
  }
}
