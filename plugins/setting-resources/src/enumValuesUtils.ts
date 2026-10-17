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
 * Validates enum values after an inline edit, using the same rules as adding a value:
 * changed values are trimmed and must be neither empty nor a duplicate of another value.
 * Unchanged values are kept as is, so existing data does not block an edit.
 * Returns the values to store, or undefined if the edit must be rejected.
 */
export function normalizeEditedEnumValues (original: string[], edited: string[]): string[] | undefined {
  const result = edited.map((it, i) => (it === original[i] ? it : it.trim()))
  for (let i = 0; i < result.length; i++) {
    const it = result[i]
    if (it === original[i]) continue
    if (it.length === 0) return undefined
    if (result.indexOf(it) !== i || result.lastIndexOf(it) !== i) return undefined
  }
  return result
}

export function isSameEnumValues (a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((it, i) => it === b[i])
}
