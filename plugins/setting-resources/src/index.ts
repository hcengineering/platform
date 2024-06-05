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

import { type Class, type Doc, type Mixin } from '@hcengineering/core'
import { type Resources } from '@hcengineering/platform'
import { getClient, MessageBox } from '@hcengineering/presentation'
import { showPopup } from '@hcengineering/ui'
import { deleteObject } from '@hcengineering/view-resources/src/utils'
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
import WorkspaceSetting from './components/WorkspaceSetting.svelte'
import WorkspaceSettings from './components/WorkspaceSettings.svelte'
import InviteSetting from './components/InviteSetting.svelte'
import Configure from './components/Configure.svelte'
import Spaces from './components/Spaces.svelte'
import setting from './plugin'
import IntegrationPanel from './components/IntegrationPanel.svelte'
import { getOwnerFirstName, getOwnerLastName, getOwnerPosition, getValue, filterDescendants } from './utils'
import ClassAttributes from './components/ClassAttributes.svelte'
import ClassAttributesList from './components/ClassAttributesList.svelte'
import ManageSpaceTypes from './components/spaceTypes/ManageSpaceTypes.svelte'
import ManageSpaceTypesTools from './components/spaceTypes/ManageSpaceTypesTools.svelte'
import ManageSpaceTypeContent from './components/spaceTypes/ManageSpaceTypeContent.svelte'
import PermissionPresenter from './components/presenters/PermissionPresenter.svelte'
import SpaceTypeDescriptorPresenter from './components/presenters/SpaceTypeDescriptorPresenter.svelte'
import SpaceTypeGeneralSectionEditor from './components/spaceTypes/editor/SpaceTypeGeneralSectionEditor.svelte'
import SpaceTypePropertiesSectionEditor from './components/spaceTypes/editor/SpaceTypePropertiesSectionEditor.svelte'
import SpaceTypeRolesSectionEditor from './components/spaceTypes/editor/SpaceTypeRolesSectionEditor.svelte'
import RoleEditor from './components/spaceTypes/RoleEditor.svelte'
import RoleAssignmentEditor from './components/typeEditors/RoleAssignmentEditor.svelte'

export { ClassSetting, filterDescendants, ClassAttributes, ClassAttributesList, SpaceTypeGeneralSectionEditor }
export * from './store'

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
          deleteObject(getClient(), o).catch((err) => {
            console.error(err)
          })
        }
      }
    }
  )
}

export default async (): Promise<Resources> => ({
  component: {
    Settings,
    Spaces,
    Profile,
    Password,
    WorkspaceSetting,
    WorkspaceSettings,
    Integrations,
    Support,
    Privacy,
    Terms,
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
    Configure,
    ManageSpaceTypes,
    ManageSpaceTypesTools,
    ManageSpaceTypeContent,
    PermissionPresenter,
    SpaceTypeDescriptorPresenter,
    SpaceTypeGeneralSectionEditor,
    SpaceTypePropertiesSectionEditor,
    SpaceTypeRolesSectionEditor,
    RoleEditor,
    RoleAssignmentEditor
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
