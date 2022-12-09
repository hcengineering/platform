//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { IntlString, mergeIds } from '@hcengineering/platform'

import bitrix, { bitrixId } from '@hcengineering/bitrix'
import { Ref } from '@hcengineering/core'
import { Handler, IntegrationType } from '@hcengineering/setting'
import { AnyComponent } from '@hcengineering/ui'

export default mergeIds(bitrixId, bitrix, {
  string: {
    BitrixTokenUrl: '' as IntlString,
    Bitrix: '' as IntlString,
    BitrixDesc: '' as IntlString,
    Settings: '' as IntlString,
    EntityMapping: '' as IntlString,
    NotAllowed: '' as IntlString,
    AddMapping: '' as IntlString,
    BitrixEntityType: '' as IntlString,
    FieldMapping: '' as IntlString,
    AddField: '' as IntlString,
    Attribute: '' as IntlString,
    MapField: '' as IntlString
  },
  component: {
    BitrixIcon: '' as AnyComponent
  },
  handler: {
    DisconnectHandler: '' as Handler
  },
  integrationType: {
    Bitrix: '' as Ref<IntegrationType>
  }
})
