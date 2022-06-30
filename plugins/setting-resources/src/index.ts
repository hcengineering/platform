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

import { Resources } from '@anticrm/platform'
import Profile from './components/Profile.svelte'
import Password from './components/Password.svelte'
import WorkspaceSettings from './components/WorkspaceSettings.svelte'
import Integrations from './components/Integrations.svelte'
import ManageStatuses from './components/statuses/ManageStatuses.svelte'
import Support from './components/Support.svelte'
import Privacy from './components/Privacy.svelte'
import Terms from './components/Terms.svelte'
import Settings from './components/Settings.svelte'
import ClassSetting from './components/ClassSetting.svelte'
import TxIntegrationDisable from './components/activity/TxIntegrationDisable.svelte'
import TxIntegrationDisableReconnect from './components/activity/TxIntegrationDisableReconnect.svelte'
import StringTypeEditor from './components/typeEditors/StringTypeEditor.svelte'
import BooleanTypeEditor from './components/typeEditors/BooleanTypeEditor.svelte'
import DateTypeEditor from './components/typeEditors/DateTypeEditor.svelte'
import NumberTypeEditor from './components/typeEditors/NumberTypeEditor.svelte'
import RefEditor from './components/typeEditors/RefEditor.svelte'
import EnumTypeEditor from './components/typeEditors/EnumTypeEditor.svelte'
import EditEnum from './components/EditEnum.svelte'
import EnumSetting from './components/EnumSetting.svelte'

export default async (): Promise<Resources> => ({
  activity: {
    TxIntegrationDisable,
    TxIntegrationDisableReconnect
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
    ManageStatuses,
    ClassSetting,
    StringTypeEditor,
    BooleanTypeEditor,
    NumberTypeEditor,
    RefEditor,
    DateTypeEditor,
    EnumTypeEditor,
    EditEnum,
    EnumSetting
  }
})
