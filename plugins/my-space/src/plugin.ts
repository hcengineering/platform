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

import { type Doc, type Ref, type SpaceTypeDescriptor } from '@hcengineering/core'
import type { Asset, IntlString, Plugin, Resource } from '@hcengineering/platform'
import { type Location, type ResolvedLocation } from '@hcengineering/ui'

import { plugin } from '@hcengineering/platform'

/** @public */
export const mySpaceId = 'mySpace' as Plugin

/** @public */
export const mySpacePlugin = plugin(mySpaceId, {
  app: {
    MySpace: '' as Ref<Doc>
  },
  icon: {
    MySpace: '' as Asset,
    Mail: '' as Asset
  },
  class: {},
  descriptors: {
    ProjectType: '' as Ref<SpaceTypeDescriptor>
  },
  string: {
    MySpace: '' as IntlString,
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString,
    Mail: '' as IntlString
  },
  resolver: {
    Location: '' as Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>
  }
})

/**
 * @public
 */
export default mySpacePlugin
