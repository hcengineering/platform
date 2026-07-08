//
// Copyright © 2024 Hardcore Engineering, Inc.
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

/**
 * Validates a `SESSION_COOKIE_DOMAIN` value before it is used to widen the
 * session cookie scope across subdomains.
 *
 * Accepts only plausible parent-domain values: an optional leading dot
 * followed by at least two dot-separated labels ending in a 2+ character TLD
 * (e.g. `.example.com`, `example.com`). Rejects whitespace, protocol, port
 * and single-label values like `com` — the latter would span the cookie
 * across a whole TLD and is a common misconfiguration footgun.
 */
export function isValidCookieDomain (domain: string): boolean {
  return /^\.?([a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain)
}
