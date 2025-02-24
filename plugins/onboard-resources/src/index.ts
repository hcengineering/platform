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

import type { IntlString, Resources } from '@hcengineering/platform'
import OnboardApp from './components/OnboardApp.svelte'

export default async (): Promise<Resources> => ({
  component: {
    OnboardApp
  }
})

export const pages = ['auth', 'onboard'] as const

export enum OnboardSteps {
  Workspace = 'workspace',
  User = 'user',
  Finish = 'finish'
}

export type Pages = (typeof pages)[number]

export interface BottomAction {
  i18n: IntlString
  page?: Pages
  func: () => void
  caption?: IntlString
}

export * from './utils'
