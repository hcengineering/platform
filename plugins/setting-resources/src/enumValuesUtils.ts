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

export type EnumValuesError = 'empty' | 'duplicate' | 'conflict'

export type EnumValuesEditResult = { values: string[] } | { error: EnumValuesError }

export function validateEditedEnumValues (original: string[], edited: string[]): EnumValuesEditResult {
  const values = edited.map((it, i) => (it === original[i] ? it : it.trim()))
  for (let i = 0; i < values.length; i++) {
    const it = values[i]
    if (it === original[i]) continue
    if (it.length === 0) return { error: 'empty' }
    if (values.indexOf(it) !== i || values.lastIndexOf(it) !== i) return { error: 'duplicate' }
  }
  return { values }
}

/**
 * Validates enum values after an inline edit, using the same rules as adding a value:
 * changed values are trimmed and must be neither empty nor a duplicate of another value.
 * Unchanged values are kept as is, so existing data does not block an edit.
 * Returns the values to store, or undefined if the edit must be rejected.
 */
export function normalizeEditedEnumValues (original: string[], edited: string[]): string[] | undefined {
  const result = validateEditedEnumValues(original, edited)
  return 'values' in result ? result.values : undefined
}

export function isSameEnumValues (a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((it, i) => it === b[i])
}

/** Keeps an active draft separate from live-query results until it is submitted. */
export class EnumValuesDraft {
  values: string[] = []
  private original: string[] = []
  private submitted: string[] | undefined
  private editing = false

  sync (stored: string[]): void {
    // An acknowledgement of our own save can rebase the next edit without replacing its text.
    if (this.submitted !== undefined && isSameEnumValues(this.submitted, stored)) {
      this.original = [...stored]
      this.submitted = undefined
      if (!this.editing) this.values = [...stored]
      return
    }
    if (this.editing || isSameEnumValues(this.original, stored)) return
    this.original = [...stored]
    this.values = [...stored]
    this.submitted = undefined
  }

  beginEdit (): void {
    this.editing = true
  }

  endEdit (stored: string[]): void {
    this.editing = false
    this.sync(stored)
  }

  finishEdit (stored: string[], normalize: boolean = true): EnumValuesEditResult {
    if (this.submitted !== undefined && isSameEnumValues(this.submitted, stored)) {
      this.original = [...stored]
    }
    let result: EnumValuesEditResult
    if (isSameEnumValues(this.original, this.values)) {
      // Focusing and leaving an unchanged field should simply pick up remote changes.
      result = { values: [...stored] }
    } else if (!isSameEnumValues(this.original, stored)) {
      result = { error: 'conflict' }
    } else {
      result = normalize ? validateEditedEnumValues(this.original, this.values) : { values: [...this.values] }
    }
    this.editing = false
    this.original = [...stored]
    this.values = 'values' in result ? [...result.values] : [...stored]
    this.submitted = 'values' in result ? [...result.values] : undefined
    return result
  }
}
