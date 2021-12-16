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

import Setting from './components/Setting.svelte'
import Integrations from './components/Integrations.svelte'
import ManageStatuses from './components/statuses/ManageStatuses.svelte'
import Support from './components/Support.svelte'
import Privacy from './components/Privacy.svelte'
import Terms from './components/Terms.svelte'
import ConnectEmail from './components/integrations/ConnectEmail.svelte'
import IconGmail from './components/icons/Gmail.svelte'

export default async () => ({
  component: {
    Setting,
    Integrations,
    Support,
    Privacy,
    Terms,
    ConnectEmail,
    IconGmail,
    ManageStatuses
  },
  handler: {
    EmailDisconnectHandler: async () => {}
  }
})
