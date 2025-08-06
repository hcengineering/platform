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
import { desktopPlatform, getCurrentLocation } from '@hcengineering/ui'
import { generateUuid } from '@hcengineering/core'
import { Analytics } from '@hcengineering/analytics'

let _isSignUp: boolean = false
export const signupStore = {
  setSignUpFlow: (isSignUp: boolean) => {
    _isSignUp = isSignUp
  },
  getSignUpFlow: () => {
    return _isSignUp
  }
}

// Session and activity tracking
class SessionManager {
  private static instance: SessionManager
  private readonly sessionId: string
  private readonly windowId: string
  private readonly sessionStartTime: number
  private pageviewId: string
  private pageStartTime: number
  private eventCount: number = 0
  private pageViewCount: number = 0
  private currentUrl: string = ''

  private constructor () {
    this.sessionId = generateUuid()
    this.windowId = generateUuid()
    this.sessionStartTime = Date.now()
    this.pageviewId = generateUuid()
    this.pageStartTime = Date.now()
    this.currentUrl = window.location.href
    this.pageViewCount = 1 // First page view

    this.setupNavigationTracking()
  }

  static getInstance (): SessionManager {
    if (SessionManager.instance === undefined) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  private setupNavigationTracking (): void {
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.onUrlChange()
      }, 0)
    })
    setInterval(() => {
      if (window.location.href !== this.currentUrl) {
        this.onUrlChange()
      }
    }, 5000)
  }

  onUrlChange (): void {
    if (window.location.href !== this.currentUrl) {
      this.currentUrl = window.location.href
      this.pageviewId = generateUuid()
      this.pageStartTime = Date.now()
      this.pageViewCount++
    }
  }

  getSessionData (): Record<string, any> {
    const now = Date.now()
    const timeOnPage = Math.floor((now - this.pageStartTime) / 1000)
    const sessionDuration = Math.floor((now - this.sessionStartTime) / 1000)

    return {
      $session_id: this.sessionId,
      $window_id: this.windowId,
      $pageview_id: this.pageviewId,
      $session_duration: sessionDuration,
      $time_on_page: timeOnPage,
      $page_view_count: this.pageViewCount,
      $event_count: this.eventCount,
      $is_first_session: this.isFirstSession(),
      $is_returning_user: this.isReturningUser(),
      $insert_id: this.generateInsertId()
    }
  }

  incrementEventCount (): void {
    this.eventCount++
  }

  private generateInsertId (): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `${timestamp}-${random}`
  }

  private isFirstSession (): boolean {
    const hasVisited = localStorage.getItem('analytics_has_visited')
    if (hasVisited === null || hasVisited === '') {
      localStorage.setItem('analytics_has_visited', 'true')
      return true
    }
    return false
  }

  private isReturningUser (): boolean {
    const firstVisit = localStorage.getItem('analytics_first_visit')
    const now = Date.now()

    if (firstVisit === null || firstVisit === '') {
      localStorage.setItem('analytics_first_visit', now.toString())
      return false
    }

    const firstVisitTime = parseInt(firstVisit, 10)
    return now - firstVisitTime > 24 * 60 * 60 * 1000
  }
}

export function triggerUrlChange (): void {
  SessionManager.getInstance().onUrlChange()
}

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
  const parser = new UAParser()
  const browser = parser.getBrowser()
  const os = parser.getOS()
  const device = parser.getDevice()

  const sessionManager = SessionManager.getInstance()
  sessionManager.incrementEventCount()
  const sessionData = sessionManager.getSessionData()
  const urlTracking = getUrlTrackingParams()
  const searchEngine = getSearchEngine(document.referrer)

  const referrer = (() => {
    if (document.referrer === '') return '$direct'

    try {
      const currentDomain = window.location.hostname
      const referrerDomain = new URL(document.referrer).hostname

      if (currentDomain === referrerDomain) return '$direct'

      return document.referrer
    } catch {
      return document.referrer
    }
  })()
  const referringDomain = referrer !== '$direct' ? new URL(referrer).hostname : '$direct'

  const now = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const timezoneOffset = -now.getTimezoneOffset()

  const browserLanguage = navigator.language !== '' ? navigator.language : 'en-US'
  const browserLanguagePrefix = browserLanguage.split('-')[0] !== '' ? browserLanguage.split('-')[0] : 'en'

  return {
    title: document.title,
    // User agent and platform info
    $lib: desktopPlatform ? 'app' : 'web',
    $lib_version: getMetadata(presentation.metadata.FrontVersion) ?? '0.0.0',
    $browser: browser.name ?? 'Unknown Browser',
    $browser_version: parseInt(browser.major ?? '0', 10),
    $browser_language: browserLanguage,
    $browser_language_prefix: browserLanguagePrefix,
    $os: os.name ?? 'Unknown OS',
    $os_version: os.version,
    $device_type: getDeviceType(device.type),
    $device_model: device.model,
    $device_vendor: device.vendor,
    $screen_height: window.screen.height,
    $screen_width: window.screen.width,
    $viewport_height: window.innerHeight,
    $viewport_width: window.innerWidth,
    $language: navigator.language,
    $raw_user_agent: navigator.userAgent,
    $timezone: timezone,
    $timezone_offset: timezoneOffset,
    $timestamp: new Date().toISOString(),
    // URL and referrer info
    $current_url: window.location.href,
    $host: window.location.host,
    $pathname: window.location.pathname,
    $search: window.location.search,
    referrer,
    $referring_domain: referringDomain,
    $search_engine: searchEngine,
    // Session and activity fields (PostHog-compatible)
    ...sessionData,
    // URL tracking parameters (UTM, etc.)
    ...urlTracking,
    // Custom event parameters
    ...properties
  }
}

function getProviderFromUrl (): string | null {
  const location = getCurrentLocation()
  const referrer = document.referrer

  if (referrer !== '') {
    try {
      const referrerUrl = new URL(referrer)
      const hostname = referrerUrl.hostname

      if (hostname === 'accounts.google.com') {
        return 'google'
      } else if (hostname === 'github.com') {
        return 'github'
      }
    } catch (error) {
      // Invalid URL, ignored
    }
  }

  if (location.query?.provider != null && location.query.provider !== '') {
    return location.query.provider
  }

  return null
}

export function trackOAuthCompletion (result: any): void {
  const provider = getProviderFromUrl()
  if (provider == null) return

  const isSignUp = signupStore.getSignUpFlow()
  const success = result != null

  const eventPrefix = isSignUp ? 'signup' : 'login'
  const eventSuffix = success ? 'completed' : 'error'
  const eventName: string = `${eventPrefix}.${provider}.${eventSuffix}`

  Analytics.handleEvent(eventName)
}
