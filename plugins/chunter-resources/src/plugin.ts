//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { mergeIds } from '@anticrm/platform'
import type { IntlString } from '@anticrm/platform'
import type { Ref, Class } from '@anticrm/core'
import type { Channel, Message } from '@anticrm/chunter'
import type { AnyComponent } from '@anticrm/ui'

import chunter, { chunterId } from '@anticrm/chunter'

export default mergeIds(chunterId, chunter, {
  component: {
    CreateChannel: '' as AnyComponent,
    ChannelView: '' as AnyComponent
  },
  class: { 
    Channel: '' as Ref<Class<Channel>>,
  },
  string: {
    Channel: '' as IntlString,
    Channels: '' as IntlString,
    CreateChannel: '' as IntlString,
    ChannelName: '' as IntlString,
    ChannelDescription: '' as IntlString,
    MakePrivate: '' as IntlString,
    MakePrivateDescription: '' as IntlString,
  }
})
