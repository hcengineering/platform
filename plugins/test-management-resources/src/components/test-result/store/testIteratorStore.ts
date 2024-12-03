//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { writable, get } from 'svelte/store'
import {
  type IteratorState,
  type StoreAdapter,
  ObjectIteratorProvider,
  getDefaultIteratorState
} from '@hcengineering/view-resources'
import testManagement, { type TestResult } from '@hcengineering/test-management'
import type { DocumentQuery, Ref } from '@hcengineering/core'

export const testIteratorStore = writable<IteratorState<TestResult>>(getDefaultIteratorState<TestResult>({}))

const adapter: StoreAdapter<TestResult> = {
  set (value: IteratorState<TestResult>) {
    testIteratorStore.set(value)
  },
  update (updater: (value: IteratorState<TestResult>) => IteratorState<TestResult>) {
    testIteratorStore.update(updater)
  },
  get () {
    return get(testIteratorStore)
  }
}

export const testResultIteratorProvider = new ObjectIteratorProvider<TestResult>(adapter)

export async function initializeIterator (
  query: DocumentQuery<TestResult>,
  currentObject: Ref<TestResult> | undefined
): Promise<void> {
  await testResultIteratorProvider.initialize(testManagement.class.TestResult, query, currentObject)
}

export function resetTestObjectIterator (): void {
  testResultIteratorProvider.reset()
}
