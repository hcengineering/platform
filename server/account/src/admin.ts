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

interface AdminEmailsLogger {
  warn?: (msg: string, attrs?: Record<string, unknown>) => void
}

/**
 * Parse the ADMIN_EMAILS env value into a normalized Set.
 *
 * - split on ','
 * - trim() each entry
 * - toLowerCase() each entry
 * - drop empty entries (ADMIN_EMAILS='', ',admin', 'admin,', 'a,,b'), so an
 *   empty email can never match an admin entry
 * - entries that are not email-shaped are KEPT by default. Existing deployments use
 *   login-id style values (the repo's own dev/tests compose files ship
 *   ADMIN_EMAILS=admin,...), so dropping them would silently revoke admin
 *   rights on upgrade. A warning lists such entries so that a typo like
 *   ADMIN_EMAILS=admin,michel@... stays visible. Deployments that want the
 *   fail-closed behaviour opt in with ADMIN_EMAILS_STRICT=true, which drops
 *   every non-email-shaped entry. The strict flag is case-insensitive so the
 *   conventional TRUE spelling does not silently disable strict mode.
 */
export function parseAdminEmails (envValue: string | undefined, logger?: AdminEmailsLogger): Set<string> {
  if (envValue == null || envValue === '') return new Set()
  const strict = process.env.ADMIN_EMAILS_STRICT?.toLowerCase() === 'true'
  const entries = envValue
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
  const nonEmail: string[] = []
  const kept: string[] = []
  for (const entry of entries) {
    if (!isEmailLike(entry)) {
      nonEmail.push(entry)
      if (strict) continue // fail-closed: dropped
    }
    kept.push(entry)
  }
  if (nonEmail.length > 0) {
    const warn =
      logger?.warn ??
      ((msg: string, attrs?: Record<string, unknown>) => {
        // eslint-disable-next-line no-console
        console.warn(msg, attrs)
      })
    const msg = strict
      ? 'ADMIN_EMAILS: non-email entries dropped (ADMIN_EMAILS_STRICT=true)'
      : 'ADMIN_EMAILS: non-email entries kept for backwards compatibility; set ADMIN_EMAILS_STRICT=true to drop them'
    warn(msg, { entries: nonEmail })
  }
  return new Set(kept)
}

function isEmailLike (value: string): boolean {
  return /^[^\s@]+@[^\s@]+$/.test(value)
}

const ADMIN_EMAILS = parseAdminEmails(process.env.ADMIN_EMAILS)

export function isAdminEmail (email: string | null | undefined): boolean {
  if (email == null || email === '') return false
  return ADMIN_EMAILS.has(email.trim().toLowerCase())
}
