//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { UAParser } from 'ua-parser-js'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { desktopPlatform } from '@hcengineering/ui'

const parser = UAParser()

function getUrlTrackingParams (): Record<string, string | null> {
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

function getSearchEngine (referrer: string): string | null {
  if (referrer == null || referrer === '') return null
  const domains = {
    'google.': 'google',
    'bing.': 'bing',
    'yahoo.': 'yahoo',
    'duckduckgo.': 'duckduckgo',
    'yandex.': 'yandex'
  }
  for (const [domain, engine] of Object.entries(domains)) {
    if (referrer.includes(domain)) return engine
  }
  return null
}

function getDeviceType (type: string | undefined | null): string {
  if (type == null || type === '') return 'Desktop'
  if (type === 'mobile') return 'Mobile'
  if (type === 'tablet') return 'Tablet'
  return 'Desktop'
}

export function collectEventMetadata (properties: Record<string, any> = {}): Record<string, any> {
  const trackingParams = getUrlTrackingParams()
  const referrer = document.referrer === '' ? '$direct' : document.referrer
  const referringDomain = referrer !== '$direct' ? new URL(referrer).hostname : '$direct'

  const now = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const timezoneOffset = -now.getTimezoneOffset()

  return {
    ...properties,
    $timestamp: new Date().toISOString(),
    $os: parser.os.name ?? 'Unknown OS',
    $os_version: parser.os.version ?? '',
    $browser: parser.browser.name ?? 'Unknown Browser',
    $browser_version: parseInt(parser.browser.major ?? '0', 10),
    $device_type: getDeviceType(parser.device.type),
    $current_url: window.location.href,
    $host: window.location.hostname,
    $pathname: window.location.pathname,
    $screen_height: window.screen.height,
    $screen_width: window.screen.width,
    $viewport_height: window.innerHeight,
    $viewport_width: window.innerWidth,
    $lib: desktopPlatform ? 'app' : 'web',
    $lib_version: getMetadata(presentation.metadata.FrontVersion) ?? '0.0.0',
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
