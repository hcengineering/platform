//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { addStringsLoader } from './i18n'
import { platformId } from './platform'
import type { Metadata } from './metadata'

export * from './platform'
export * from './ident'
export * from './status'
export * from './event'
export * from './resource'
export * from './i18n'
export * from './metadata'
export * from './rpc'

addStringsLoader(platformId, async (lang: string) => {
  switch (lang) {
    case 'en':
      return (await import('./lang/en.json'))
  }
  throw new Error('unsupported language')
})

type URL = string
export type Asset = Metadata<URL>
