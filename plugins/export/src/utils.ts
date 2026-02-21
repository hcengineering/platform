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
import type { Doc } from '@hcengineering/core'

/**
 * Checks if a document should be skipped based on its state.
 * Returns true if the document should be skipped (archived, deleted, or obsolete).
 * @param doc - The document to check
 * @returns true if the document should be skipped, false otherwise
 */
export function shouldSkipDocument (doc: Doc): boolean {
  // Check if document has a state field
  if ('state' in doc) {
    const docWithState = doc as Doc & { state?: string }
    if (typeof docWithState.state === 'string') {
      const state = docWithState.state
      // Skip documents in archived, deleted, or obsolete state
      if (state === 'deleted' || state === 'archived' || state === 'obsolete') {
        return true
      }
    }
  }
  return false
}

/**
 * Checks if a document has effective status (only such docs should be exported when "export only effective" is on).
 * Returns true if the document has no state property or state === 'effective'.
 * @param doc - The document to check
 * @returns true if the document is effective or has no state, false otherwise
 */
export function isEffectiveDocument (doc: Doc): boolean {
  if (!('state' in doc)) return true
  const docWithState = doc as Doc & { state?: string }
  return typeof docWithState.state === 'string' && docWithState.state === 'effective'
}
