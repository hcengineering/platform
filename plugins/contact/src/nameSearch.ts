//
// Copyright © 2026 Hardcore Engineering Inc.
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
 * @public
 */
export interface NameSearch {
  // Pattern for a `$like` query on the server side.
  like: string
  // Client side check, which has to be applied to the values returned by the `like` query.
  matches: (value: unknown) => boolean
}

/**
 * Plain substring search: `%search%`.
 * @public
 */
export function getPlainSearch (search: string): NameSearch {
  return { like: '%' + search + '%', matches: () => true }
}

/**
 * Split a search string into words, separated by whitespace or commas.
 * @public
 */
export function getNameSearchTokens (search: string): string[] {
  return search.split(/[\s,]+/).filter((it) => it.length > 0)
}

/**
 * Build a search for name like fields.
 *
 * Person names are stored as `Last,First`, so a plain `%First Last%` pattern never matches.
 * When the search contains more than one word every word should be present in the value,
 * in any order. Query adapters do not support combining several `$like` conditions for the
 * same field, so the server is queried with the longest word and the rest is checked on the client.
 *
 * A single word search keeps the plain `%search%` pattern.
 * @public
 */
export function getNameSearch (search: string): NameSearch {
  const tokens = getNameSearchTokens(search)
  if (tokens.length < 2) {
    return getPlainSearch(search)
  }
  const longest = tokens.reduce((a, b) => (b.length > a.length ? b : a))
  const lower = tokens.map((it) => it.toLowerCase())
  return {
    like: '%' + longest + '%',
    matches: (value) => {
      if (value == null) return false
      const str = String(value).toLowerCase()
      return lower.every((it) => str.includes(it))
    }
  }
}
