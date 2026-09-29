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

/**
 * Decide the value to sync from the parent `value` prop into the local input.
 *
 * Returns the value to write into the input, or `undefined` to leave the local
 * input untouched.
 *
 * The rule is: re-sync ONLY when the parent prop itself changed since the last
 * sync (`value !== lastValue`). It must NOT depend on the current local input,
 * because the reactive block that calls it would then re-run on every local
 * edit; since the parent prop lags behind (updated only after the debounced
 * emit), that would clobber the just-typed value back to the stale prop and
 * erase input mid-typing (which broke the tracker create→search→open flow:
 * Playwright fill() then read == empty, so the search was never submitted).
 */
export function propSyncValue (value: string | undefined, lastValue: string | undefined): string | undefined {
  if (value === lastValue || value === undefined) return undefined
  return value
}
