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
 * Resolves the attribute default value after a type editor `change` event.
 * An editor that clears the default emits `defaultValue: undefined`, which must
 * replace the current value; an editor that does not send the key at all
 * (e.g. only `{ extra }`) must keep it.
 */
export function nextDefaultValue (detail: Record<string, any> | undefined, current: any): any {
  if (detail !== undefined && 'defaultValue' in detail) {
    return detail.defaultValue
  }
  return current
}

/**
 * Builds the attribute update for a changed default value. A cleared default is
 * removed with `$unset`, since an `undefined` field is dropped from the transaction.
 */
export function defaultValueUpdate (next: any, current: any): { defaultValue?: any, $unset?: { defaultValue: true } } {
  if (next === current) return {}
  if (next === undefined || next === null) {
    return current === undefined || current === null ? {} : { $unset: { defaultValue: true } }
  }
  return { defaultValue: next }
}
