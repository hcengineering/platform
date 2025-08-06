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

import { type IntlString, mergeIds } from '@hcengineering/platform'

import telegram, { telegramId } from '@hcengineering/telegram'
import { type AnyComponent } from '@hcengineering/ui/src/types'

export default mergeIds(telegramId, telegram, {
  string: {
    Loading: '' as IntlString,
    IntegrationConnected: '' as IntlString,

    Disconnect: '' as IntlString,
    Next: '' as IntlString,
    Back: '' as IntlString,
    Connect: '' as IntlString,
    Connecting: '' as IntlString,
    ConnectFull: '' as IntlString,
    Password: '' as IntlString,
    Phone: '' as IntlString,
    PhonePlaceholder: '' as IntlString,
    PhoneDescr: '' as IntlString,
    PasswordDescr: '' as IntlString,
    CodeDescr: '' as IntlString,
    Cancel: '' as IntlString,
    Share: '' as IntlString,
    PublishSelected: '' as IntlString,
    MessagesSelected: '' as IntlString,
    ConnectBotInfoStart: '' as IntlString,
    ConnectBotInfoEnd: '' as IntlString,
    ConnectBotError: '' as IntlString,
    TestConnection: '' as IntlString,
    Connected: '' as IntlString,
    Public: '' as IntlString,
    Private: '' as IntlString,
    TotalChannels: '' as IntlString,
    SyncedChannels: '' as IntlString,
    SyncEnabled: '' as IntlString,
    SyncDisabled: '' as IntlString,
    SelectAll: '' as IntlString,
    Selected: '' as IntlString,
    EnableSync: '' as IntlString,
    DisableSync: '' as IntlString,
    SelectAccess: '' as IntlString,
    ConfigureIntegration: '' as IntlString,
    Apply: '' as IntlString,

    // Filter categories
    Type: '' as IntlString,
    SyncMode: '' as IntlString,
    Access: '' as IntlString,

    // Filter options
    User: '' as IntlString,
    Group: '' as IntlString,
    Channel: '' as IntlString,

    // Actions
    Actions: '' as IntlString,
    SelectAllAction: '' as IntlString,
    UnselectAllAction: '' as IntlString,
    EnableSynchronization: '' as IntlString,
    DisableSynchronization: '' as IntlString,
    SetPublicAccess: '' as IntlString,
    SetPrivateAccess: '' as IntlString,

    // Search and empty state messages
    NoChannelsFound: '' as IntlString,
    TryAdjustingSearch: '' as IntlString,
    ClearSearch: '' as IntlString,
    NoChannelsAvailable: '' as IntlString,
    EnableSyncToConfigure: '' as IntlString,
    ServiceIsUnavailable: '' as IntlString,
    AccessCannotBeChanged: '' as IntlString,
    IncorrectPhoneOrCode: '' as IntlString,
    UnknownError: '' as IntlString
  },
  component: {
    MessagePresenter: '' as AnyComponent
  }
})
