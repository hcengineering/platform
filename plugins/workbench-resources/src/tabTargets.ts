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

function safeDecode (value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Checks whether a tab location points to one of the removed documents.
 *
 * A location references a document either by its plain id (as a path, fragment or query part)
 * or by a link id ending with it (like `title-<id>`). Documents referenced by another link id
 * (like an issue identifier) are matched through the already resolved target id.
 */
export function isTabOfRemovedDoc (location: string, removed: Set<string>, target?: string): boolean {
  if (removed.size === 0) return false
  if (target !== undefined && removed.has(target)) return true

  const parts = safeDecode(location).split(/[/|#?&=]/)
  for (const part of parts) {
    if (part === '') continue
    if (removed.has(part)) return true
    const dash = part.lastIndexOf('-')
    if (dash !== -1 && removed.has(part.slice(dash + 1))) return true
  }
  return false
}
