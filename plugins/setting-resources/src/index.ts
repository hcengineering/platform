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
import Setting from './components/Setting.svelte'
import Integrations from './components/Integrations.svelte'
import ManageStatuses from './components/statuses/ManageStatuses.svelte'
import Support from './components/Support.svelte'
import Privacy from './components/Privacy.svelte'
import Terms from './components/Terms.svelte'
import Settings from './components/Settings.svelte'
import TxIntegrationDisable from './components/activity/TxIntegrationDisable.svelte'
import TxIntegrationDisableReconnect from './components/activity/TxIntegrationDisableReconnect.svelte'

export default async (): Promise<Resources> => ({
  activity: {
    TxIntegrationDisable,
    TxIntegrationDisableReconnect
  },
  component: {
    Settings,
    Profile,
    Password,
    Setting,
    Integrations,
    Support,
    Privacy,
    Terms,
    ManageStatuses
  }
})
