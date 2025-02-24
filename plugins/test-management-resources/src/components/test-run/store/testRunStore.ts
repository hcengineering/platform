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

import type { Ref } from '@hcengineering/core'
import type { TestCase, TestPlan } from '@hcengineering/test-management'
import { writable } from 'svelte/store'

export const selectedTestCases = writable<TestCase[] | undefined>(undefined)
export const selectedTestPlan = writable<Ref<TestPlan> | undefined>(undefined)

export const resetStore = (): void => {
  selectedTestCases.set(undefined)
  selectedTestPlan.set(undefined)
}

export const setSelected = (testPlan: Ref<TestPlan> | undefined, testCases: TestCase[] | undefined): void => {
  selectedTestPlan.set(testPlan)
  selectedTestCases.set(testCases)
}
