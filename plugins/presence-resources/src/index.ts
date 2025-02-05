//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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

import { type Resources } from '@hcengineering/platform'

import Presence from './components/Presence.svelte'
import PresenceAvatars from './components/PresenceAvatars.svelte'
import WorkbenchExtension from './components/WorkbenchExtension.svelte'
import { getFollowee, sendMyData, subscribeToOtherData, unsubscribeFromOtherData } from './store'

export { Presence, PresenceAvatars }
export { updateMyPresence, removeMyPresence, presenceByObjectId } from './store'

export * from './types'

export default async (): Promise<Resources> => ({
  component: {
    Presence,
    PresenceAvatars,
    WorkbenchExtension
  },
  function: {
    SendMyData: sendMyData,
    GetFollowee: getFollowee,
    SubscribeToOtherData: subscribeToOtherData,
    UnsubscribeFromOtherData: unsubscribeFromOtherData
  }
})
