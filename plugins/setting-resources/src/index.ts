//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { Class, Doc, Mixin } from '@hcengineering/core'
import { Resources } from '@hcengineering/platform'
import { getClient, MessageBox } from '@hcengineering/presentation'
import { showPopup } from '@hcengineering/ui'
import { deleteObject } from '@hcengineering/view-resources/src/utils'
import TxIntegrationDisable from './components/activity/TxIntegrationDisable.svelte'
import ClassSetting from './components/ClassSetting.svelte'
import CreateMixin from './components/CreateMixin.svelte'
import EditEnum from './components/EditEnum.svelte'
import EnumSetting from './components/EnumSetting.svelte'
import Integrations from './components/Integrations.svelte'
import Owners from './components/Owners.svelte'
import Password from './components/Password.svelte'
import Privacy from './components/Privacy.svelte'
import Profile from './components/Profile.svelte'
import Settings from './components/Settings.svelte'
import ManageTemplates from './components/statuses/ManageTemplates.svelte'
import Support from './components/Support.svelte'
import Terms from './components/Terms.svelte'
import BooleanTypeEditor from './components/typeEditors/BooleanTypeEditor.svelte'
import DateTypeEditor from './components/typeEditors/DateTypeEditor.svelte'
import EnumTypeEditor from './components/typeEditors/EnumTypeEditor.svelte'
import HyperlinkTypeEditor from './components/typeEditors/HyperlinkTypeEditor.svelte'
import NumberTypeEditor from './components/typeEditors/NumberTypeEditor.svelte'
import ArrayEditor from './components/typeEditors/ArrayEditor.svelte'
import RefEditor from './components/typeEditors/RefEditor.svelte'
import StringTypeEditor from './components/typeEditors/StringTypeEditor.svelte'
import WorkspaceSettings from './components/WorkspaceSettings.svelte'
import InviteSetting from './components/InviteSetting.svelte'
import Configure from './components/Configure.svelte'
import setting from './plugin'
import IntegrationPanel from './components/IntegrationPanel.svelte'
import { getOwnerFirstName, getOwnerLastName, getOwnerPosition, getValue } from './utils'

export { ClassSetting }

async function DeleteMixin (object: Mixin<Class<Doc>>): Promise<void> {
  const docs = await getClient().findAll(object._id, {}, { limit: 1 })

  showPopup(
    MessageBox,
    {
      label: setting.string.DeleteMixin,
      message: docs.length > 0 ? setting.string.DeleteMixinExistConfirm : setting.string.DeleteMixinConfirm,
      params: { count: docs.length }
    },
    undefined,
    (result?: boolean) => {
      if (result === true) {
        const objs = Array.isArray(object) ? object : [object]
        for (const o of objs) {
          deleteObject(getClient(), o).catch((err) => console.error(err))
        }
      }
    }
  )
}

export default async (): Promise<Resources> => ({
  activity: {
    TxIntegrationDisable
  },
  component: {
    Settings,
    Profile,
    Password,
    WorkspaceSettings,
    Integrations,
    Support,
    Privacy,
    Terms,
    ManageTemplates,
    ClassSetting,
    StringTypeEditor,
    HyperlinkTypeEditor,
    BooleanTypeEditor,
    NumberTypeEditor,
    RefEditor,
    DateTypeEditor,
    EnumTypeEditor,
    ArrayEditor,
    EditEnum,
    EnumSetting,
    Owners,
    CreateMixin,
    InviteSetting,
    IntegrationPanel,
    Configure
  },
  actionImpl: {
    DeleteMixin
  },
  function: {
    GetOwnerFirstName: getOwnerFirstName,
    GetOwnerLastName: getOwnerLastName,
    GetOwnerPosition: getOwnerPosition,
    GetValue: getValue
  }
})
