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

import type { Enum } from '@hcengineering/core'

export type EnumValuesError = 'empty' | 'duplicate' | 'conflict' | 'referenced' | 'saveFailed'

export type EnumValuesEditResult = { values: string[] } | { error: EnumValuesError }

export function validateEditedEnumValues (original: string[], edited: string[]): EnumValuesEditResult {
  const values = edited.map((it, i) => (it === original[i] ? it : it.trim()))
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  for (let i = 0; i < values.length; i++) {
    const it = values[i]
    if (it === original[i]) continue
    if (it.length === 0) return { error: 'empty' }
    if ((counts.get(it) ?? 0) > 1) return { error: 'duplicate' }
  }
  return { values }
}

/**
 * Validates enum values after an inline edit:
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
  private received: string[] = []
  private readonly submitted: Array<{ id: number, values: string[] }> = []
  private submission = 0
  private supersession = 0
  private editing = false
  private conflict = false
  private retryValues: string[] | undefined

  get needsRetry (): boolean {
    return this.retryValues !== undefined
  }

  sync (stored: string[]): void {
    if (isSameEnumValues(this.received, stored)) return
    this.received = [...stored]
    // A failed model transaction can already have appeared in the local query.
    // Its echo is not persistence evidence; keep the unsaved draft retryable.
    if (this.retryValues !== undefined && isSameEnumValues(this.retryValues, stored)) return
    // Query results acknowledge a prefix of our submissions. An earlier acknowledgement
    // must never replace a later submission or the text being typed on top of it.
    const acknowledged = this.submitted.findIndex(({ values }) => isSameEnumValues(values, stored))
    if (acknowledged !== -1) {
      this.submitted.splice(0, acknowledged + 1)
      this.original = [...(this.retryValues ?? this.submitted[this.submitted.length - 1]?.values ?? stored)]
      if (!this.editing) this.values = [...this.original]
      return
    }
    // Unlike an own optimistic acknowledgement, a divergent delivery invalidates
    // outstanding failures even while active typing keeps the old baseline.
    this.supersession++
    this.retryValues = undefined
    this.submitted.length = 0
    if (this.editing) {
      this.conflict = true
      return
    }
    this.original = [...stored]
    this.values = [...stored]
    this.conflict = false
  }

  beginEdit (): void {
    this.editing = true
  }

  endEdit (stored: string[]): void {
    // Only canceled drags end here. A completed drop submits before dragend.
    this.editing = false
    this.sync(stored)
    if (this.conflict) {
      this.original = [...stored]
      this.retryValues = undefined
    }
    this.values = [...this.original]
    this.conflict = false
  }

  finishEdit (
    stored: string[],
    normalize: boolean = true,
    canSave?: (values: string[]) => boolean
  ): EnumValuesEditResult {
    this.sync(stored)
    let result: EnumValuesEditResult
    if (isSameEnumValues(this.original, this.values)) {
      // Focusing and leaving an unchanged field should simply pick up remote changes.
      result = { values: [...(this.conflict ? stored : this.original)] }
    } else if (this.conflict) {
      result = { error: 'conflict' }
    } else {
      result = normalize ? validateEditedEnumValues(this.original, this.values) : { values: [...this.values] }
    }
    if ('values' in result && canSave !== undefined && !canSave(result.values)) {
      result = { error: 'referenced' }
    }
    this.editing = false
    if (
      'values' in result &&
      !this.conflict &&
      (!isSameEnumValues(result.values, this.original) ||
        (this.retryValues !== undefined && isSameEnumValues(result.values, this.retryValues)))
    ) {
      this.submission++
      this.submitted.push({ id: this.submission, values: [...result.values] })
      this.retryValues = undefined
    }
    this.values = 'values' in result ? [...result.values] : [...(this.conflict ? stored : this.original)]
    this.original = [...this.values]
    if (this.conflict) this.retryValues = undefined
    this.conflict = false
    return result
  }

  async save (
    client: { update: (value: Enum, changes: { enumValues: string[] }) => Promise<unknown> },
    value: Enum,
    normalize: boolean = true,
    canSave?: (values: string[]) => boolean
  ): Promise<EnumValuesEditResult> {
    const previousSubmission = this.submission
    const result = this.finishEdit(value.enumValues, normalize, canSave)
    // Enter and its following blur share the optimistic baseline, even before the
    // query acknowledges the write. Only a known failure permits an unchanged retry.
    if ('values' in result && this.submission !== previousSubmission) {
      const submission = this.submission
      const supersession = this.supersession
      const enumValues = [...result.values]
      try {
        await client.update(value, { enumValues })
      } catch (error) {
        const failed = this.submitted.findIndex(({ id }) => id === submission)
        if (failed !== -1) this.submitted.splice(failed, 1)
        // Preserve the user's text and force the unchanged retry to write again,
        // even if an optimistic query already acknowledged this submission.
        // A newer full-list submission or delivered conflict supersedes this one.
        if (this.supersession === supersession && isSameEnumValues(this.original, enumValues)) {
          this.retryValues = [...enumValues]
        }
        throw error
      }
    }
    return result
  }
}
