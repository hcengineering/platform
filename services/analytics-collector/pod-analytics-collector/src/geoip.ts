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

import * as maxmind from 'maxmind'
import * as path from 'path'
import * as fs from 'fs'
import { type MeasureContext } from '@hcengineering/core'

// MaxMind reader instances
let cityReader: maxmind.Reader<maxmind.CityResponse> | null = null
let countryReader: maxmind.Reader<maxmind.CountryResponse> | null = null
let loadingPromise: Promise<void> | null = null
let isInitialized = false
let logContext: MeasureContext | null = null

// Database paths - can be overridden via environment variables
const DB_DIR = process.env.GEOIP_DB_DIR ?? path.join(__dirname, '../geodb')
const CITY_DB_PATH = process.env.GEOIP_CITY_DB ?? path.join(DB_DIR, 'GeoLite2-City.mmdb')
const COUNTRY_DB_PATH = process.env.GEOIP_COUNTRY_DB ?? path.join(DB_DIR, 'GeoLite2-Country.mmdb')
const ALLOW_PRIVATE_IP = process.env.GEOIP_ALLOW_PRIVATE_IP === 'true'

/**
 * Set logging context for structured logging
 */
export function setGeoipLogContext (ctx: MeasureContext): void {
  logContext = ctx
}

export const geoFieldMapping = {
  country: '$geoip_country_code',
  country_name: '$geoip_country_name',
  city: '$geoip_city_name',
  latitude: '$geoip_latitude',
  longitude: '$geoip_longitude',
  timezone_geoip: '$geoip_time_zone',
  continent_code: '$geoip_continent_code',
  continent_name: '$geoip_continent_name',
  subdivision_1_code: '$geoip_subdivision_1_code',
  subdivision_1_name: '$geoip_subdivision_1_name',
  postal_code: '$geoip_postal_code',
  accuracy_radius: '$geoip_accuracy_radius'
}

export interface GeoLocationData {
  // Basic geodata
  country: string | null
  country_name: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  timezone_geoip: string | null

  // Additional PostHog data
  continent_code: string | null
  continent_name: string | null
  subdivision_1_code: string | null
  subdivision_1_name: string | null
  postal_code: string | null
  accuracy_radius: number | null
}

// Initialize MaxMind databases
async function initializeMaxMind (): Promise<void> {
  if (loadingPromise !== null) {
    await loadingPromise
    return
  }

  loadingPromise = (async () => {
    try {
      const log = logContext ?? { info: console.log, warn: console.warn, error: console.error }
      log.info('Initializing MaxMind GeoIP databases...', { dbDir: DB_DIR })

      // Check if database files exist
      const cityDbExists = fs.existsSync(CITY_DB_PATH)
      const countryDbExists = fs.existsSync(COUNTRY_DB_PATH)

      if (!cityDbExists && !countryDbExists) {
        log.warn('MaxMind database files not found - IP geolocation disabled', {
          cityPath: CITY_DB_PATH,
          countryPath: COUNTRY_DB_PATH
        })
        isInitialized = true
        return
      }

      // Load City database (priority - has more detailed info)
      if (cityDbExists) {
        try {
          cityReader = await maxmind.open<maxmind.CityResponse>(CITY_DB_PATH)
          log.info('GeoLite2-City database loaded successfully', { path: CITY_DB_PATH })
        } catch (error) {
          log.error('Failed to load GeoLite2-City database', { path: CITY_DB_PATH, error })
        }
      }

      // Load Country database (fallback)
      if (countryDbExists && cityReader === null) {
        try {
          countryReader = await maxmind.open<maxmind.CountryResponse>(COUNTRY_DB_PATH)
          log.info('GeoLite2-Country database loaded successfully', { path: COUNTRY_DB_PATH })
        } catch (error) {
          log.error('Failed to load GeoLite2-Country database', { path: COUNTRY_DB_PATH, error })
        }
      }

      if (cityReader !== null || countryReader !== null) {
        const databases = []
        if (cityReader !== null) databases.push('GeoLite2-City')
        if (countryReader !== null) databases.push('GeoLite2-Country')
        log.info('MaxMind GeoIP ready - IP geolocation enabled', { databases })
      } else {
        log.warn('No MaxMind databases could be loaded - IP geolocation disabled')
      }

      isInitialized = true
    } catch (error) {
      const log = logContext ?? { error: console.error }
      log.error('Failed to initialize MaxMind', { error })
      isInitialized = true
    }
  })()

  await loadingPromise
}

/**
 * Gets the client IP address from request headers or connection
 */
export function getClientIp (req: any): string {
  // Check X-Forwarded-For header first
  const forwardedFor = req.headers['x-forwarded-for']
  if (forwardedFor != null && typeof forwardedFor === 'string') {
    const ips = forwardedFor.split(',').map((ip: string) => ip.trim())
    return normalizeIp(ips[0])
  }

  // Check other common headers
  const cfConnectingIp = req.headers['cf-connecting-ip']
  if (cfConnectingIp != null && typeof cfConnectingIp === 'string') {
    return normalizeIp(cfConnectingIp)
  }

  const realIp = req.headers['x-real-ip']
  if (realIp != null && typeof realIp === 'string') {
    return normalizeIp(realIp)
  }

  // Fallback to connection IP
  const ip = req.ip ?? req.connection?.remoteAddress ?? req.socket?.remoteAddress ?? '127.0.0.1'
  return normalizeIp(ip)
}

/**
 * Collects all possible IP addresses from request headers and connection
 * Returns an object with all found IPs for debugging purposes
 */
export function getAllPossibleIps (req: any): Record<string, string | null> {
  const ips: Record<string, string | null> = {}

  // Connection IP
  const connectionIp = req.ip ?? req.connection?.remoteAddress ?? req.socket?.remoteAddress
  if (connectionIp != null) {
    ips.ip_connection = normalizeIp(connectionIp)
  }

  // X-Forwarded-For header (can contain multiple IPs)
  const forwardedFor = req.headers['x-forwarded-for']
  if (forwardedFor != null && typeof forwardedFor === 'string') {
    ips.ip_x_forwarded_for_raw = forwardedFor
    const forwardedIps = forwardedFor.split(',').map((ip: string) => normalizeIp(ip.trim()))
    forwardedIps.forEach((ip, index) => {
      ips[`ip_x_forwarded_for_${index + 1}`] = ip
    })
    ips.ip_x_forwarded_for_first = forwardedIps[0] ?? null
    ips.ip_x_forwarded_for_last = forwardedIps[forwardedIps.length - 1] ?? null
  }

  // Cloudflare
  const cfConnectingIp = req.headers['cf-connecting-ip']
  if (cfConnectingIp != null && typeof cfConnectingIp === 'string') {
    ips.ip_cf_connecting_ip = normalizeIp(cfConnectingIp)
  }

  // X-Real-IP
  const realIp = req.headers['x-real-ip']
  if (realIp != null && typeof realIp === 'string') {
    ips.ip_x_real_ip = normalizeIp(realIp)
  }

  // X-Client-IP
  const xClientIp = req.headers['x-client-ip']
  if (xClientIp != null && typeof xClientIp === 'string') {
    ips.ip_x_client_ip = normalizeIp(xClientIp)
  }

  // True-Client-IP
  const trueClientIp = req.headers['true-client-ip']
  if (trueClientIp != null && typeof trueClientIp === 'string') {
    ips.ip_true_client_ip = normalizeIp(trueClientIp)
  }

  // X-Original-Forwarded-For
  const xOriginalForwardedFor = req.headers['x-original-forwarded-for']
  if (xOriginalForwardedFor != null && typeof xOriginalForwardedFor === 'string') {
    ips.ip_x_original_forwarded_for = normalizeIp(xOriginalForwardedFor)
  }

  // X-Cluster-Client-IP
  const xClusterClientIp = req.headers['x-cluster-client-ip']
  if (xClusterClientIp != null && typeof xClusterClientIp === 'string') {
    ips.ip_x_cluster_client_ip = normalizeIp(xClusterClientIp)
  }

  // X-Forwarded
  const xForwarded = req.headers['x-forwarded']
  if (xForwarded != null && typeof xForwarded === 'string') {
    ips.ip_x_forwarded = normalizeIp(xForwarded)
  }

  // Forwarded-For
  const forwardedForAlt = req.headers['forwarded-for']
  if (forwardedForAlt != null && typeof forwardedForAlt === 'string') {
    ips.ip_forwarded_for = normalizeIp(forwardedForAlt)
  }

  // Forwarded (RFC 7239)
  const forwarded = req.headers.forwarded
  if (forwarded != null && typeof forwarded === 'string') {
    ips.ip_forwarded_raw = forwarded
    // Try to extract IP from Forwarded header (format: for=192.0.2.60;proto=http;by=203.0.113.43)
    const forMatch = forwarded.match(/for=([^;,]+)/)
    if (forMatch != null) {
      let extractedIp = forMatch[1]
      // Remove quotes and brackets if present
      extractedIp = extractedIp.replace(/["[\]]/g, '')
      ips.ip_forwarded_for_extracted = normalizeIp(extractedIp)
    }
  }

  return ips
}

/**
 * Normalize IP address (convert IPv6-mapped IPv4 to plain IPv4)
 */
function normalizeIp (ip: string): string {
  if (ip == null) return '127.0.0.1'

  // Convert IPv6-mapped IPv4 addresses (::ffff:192.168.1.1) to IPv4 (192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7)
  }

  // Remove IPv6 zone identifier if present
  if (ip.includes('%')) {
    return ip.split('%')[0]
  }

  return ip.trim()
}

/**
 * Checks if IP address is local/private
 */
function isPrivateIp (ip: string): boolean {
  if (ip == null || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return true
  }

  // IPv4 private ranges
  const ipv4PrivateRanges = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^169\.254\./, // 169.254.0.0/16 (Link-local)
    /^127\./ // 127.0.0.0/8 (Loopback)
  ]

  return ipv4PrivateRanges.some((range) => range.test(ip))
}

/**
 * Gets geolocation data by IP address using MaxMind GeoLite2 databases
 */
export async function getGeoLocationFromIp (req: any): Promise<GeoLocationData> {
  const ip = getClientIp(req)

  // If IP is private or local, return null data (unless explicitly allowed)
  if (isPrivateIp(ip) && !ALLOW_PRIVATE_IP) {
    return createNullGeoData()
  }

  try {
    // Ensure MaxMind is initialized
    if (!isInitialized) {
      await initializeMaxMind()
    }

    // Try City database first (has more detailed info)
    if (cityReader !== null) {
      const geo = cityReader.get(ip)
      if (geo !== null) {
        const geoData = extractGeoDataFromCity(geo)
        const hasGeoData = geoData.country !== null || geoData.city !== null || geoData.latitude !== null
        if (hasGeoData) {
          return geoData
        }
      }
    }

    // Fallback to Country database
    if (countryReader !== null) {
      const geo = countryReader.get(ip)
      if (geo !== null) {
        const geoData = extractGeoDataFromCountry(geo)
        const hasGeoData = geoData.country !== null
        if (hasGeoData) {
          return geoData
        }
      }
    }

    return createNullGeoData()
  } catch (error) {
    return createNullGeoData()
  }
}

/**
 * Extract geo data from MaxMind City response
 */
function extractGeoDataFromCity (geo: maxmind.CityResponse): GeoLocationData {
  return {
    country: geo.country?.iso_code ?? null,
    country_name: geo.country?.names?.en ?? null,
    city: geo.city?.names?.en ?? null,
    latitude: geo.location?.latitude ?? null,
    longitude: geo.location?.longitude ?? null,
    timezone_geoip: geo.location?.time_zone ?? null,
    continent_code: geo.continent?.code ?? null,
    continent_name: geo.continent?.names?.en ?? null,
    subdivision_1_code: geo.subdivisions?.[0]?.iso_code ?? null,
    subdivision_1_name: geo.subdivisions?.[0]?.names?.en ?? null,
    postal_code: geo.postal?.code ?? null,
    accuracy_radius: geo.location?.accuracy_radius ?? null
  }
}

/**
 * Extract geo data from MaxMind Country response
 */
function extractGeoDataFromCountry (geo: maxmind.CountryResponse): GeoLocationData {
  return {
    country: geo.country?.iso_code ?? null,
    country_name: geo.country?.names?.en ?? null,
    city: null, // Country DB doesn't have city info
    latitude: null,
    longitude: null,
    timezone_geoip: null,
    continent_code: geo.continent?.code ?? null,
    continent_name: geo.continent?.names?.en ?? null,
    subdivision_1_code: null,
    subdivision_1_name: null,
    postal_code: null,
    accuracy_radius: null
  }
}

/**
 * Creates null geo data object
 */
function createNullGeoData (): GeoLocationData {
  return {
    country: null,
    country_name: null,
    city: null,
    latitude: null,
    longitude: null,
    timezone_geoip: null,
    continent_code: null,
    continent_name: null,
    subdivision_1_code: null,
    subdivision_1_name: null,
    postal_code: null,
    accuracy_radius: null
  }
}

/**
 * Initialize MaxMind on module load
 */
initializeMaxMind().catch(console.error)
