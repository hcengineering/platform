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

import {
  type Doc,
  type Ref,
  type SpaceTypeDescriptor
} from '@hcengineering/core'
import type { Asset, IntlString, Plugin } from '@hcengineering/platform'

import { plugin } from '@hcengineering/platform'

/** @public */
export const personalBrowserId = 'personalBrowser' as Plugin

/** @public */
export const personalBrowserPlugin = plugin(personalBrowserId, {
  app: {
    PersonalBrowser: '' as Ref<Doc>
  },
  icon: {
    PersonalBrowser: '' as Asset
  },
  class: {
  },
  descriptors: {
    ProjectType: '' as Ref<SpaceTypeDescriptor>
  },
  string: {
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString
  }
})

/**
 * @public
 */
export default personalBrowserPlugin
