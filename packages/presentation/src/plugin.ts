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

import { Class, Ref } from '@hcengineering/core'
import type { IntlString, Metadata, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { ObjectSearchCategory } from './types'

/**
 * @public
 */
export const presentationId = 'presentation' as Plugin

export default plugin(presentationId, {
  class: {
    ObjectSearchCategory: '' as Ref<Class<ObjectSearchCategory>>
  },
  string: {
    Create: '' as IntlString,
    Cancel: '' as IntlString,
    Ok: '' as IntlString,
    Save: '' as IntlString,
    Download: '' as IntlString,
    Close: '' as IntlString,
    NotSelected: '' as IntlString,
    Deselect: '' as IntlString,
    Archived: '' as IntlString,
    AddSocialLinks: '' as IntlString,
    EditSocialLinks: '' as IntlString,
    Change: '' as IntlString,
    Remove: '' as IntlString,
    Members: '' as IntlString,
    Search: '' as IntlString,
    Spaces: '' as IntlString,
    Unassigned: '' as IntlString,
    CreateMore: '' as IntlString,
    NumberMembers: '' as IntlString,
    NumberSpaces: '' as IntlString,
    InThis: '' as IntlString,
    NoMatchesInThis: '' as IntlString,
    NoMatchesFound: '' as IntlString,
    NotInThis: '' as IntlString,
    Add: '' as IntlString,
    Edit: '' as IntlString,
    SelectAvatar: '' as IntlString,
    GravatarsManaged: '' as IntlString,
    CategoryCurrentUser: '' as IntlString,
    Assigned: '' as IntlString,
    CategoryPreviousAssigned: '' as IntlString,
    CategoryProjectLead: '' as IntlString,
    CategoryProjectMembers: '' as IntlString,
    CategoryOther: '' as IntlString
  },
  metadata: {
    RequiredVersion: '' as Metadata<string>,
    Draft: '' as Metadata<Record<string, any>>
  }
})
