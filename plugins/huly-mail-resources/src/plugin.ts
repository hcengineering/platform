//
// Copyright © 2025 Hardcore Engineering Inc.
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

import hulyMail, { hulyMailId } from '@hcengineering/huly-mail'

export default mergeIds(hulyMailId, hulyMail, {
  string: {
    Connect: '' as IntlString,
    ConnectHulyMail: '' as IntlString,
    Email: '' as IntlString,
    FailedToConnect: '' as IntlString,
    Configure: '' as IntlString,
    ChannelSpace: '' as IntlString,
    PersonSpaceInfo: '' as IntlString,
    SharedSpaceInfo: '' as IntlString,
    Mailbox: '' as IntlString,
    MailboxesNotConfigured: '' as IntlString,
    ConfigureMailBoxes: '' as IntlString
  }
})
