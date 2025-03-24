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

import { type AccountID, type SocialID } from '@hcengineering/communication-types'
import { type ConnectionInfo, type RequestEvent, RequestEventType } from '@hcengineering/communication-sdk-types'
import { type Account, systemAccountUuid } from '@hcengineering/core'

export class Permissions {
  validate(info: ConnectionInfo, event: RequestEvent): void {
    switch (event.type) {
      case RequestEventType.CreateMessage:
      case RequestEventType.CreatePatch:
      case RequestEventType.CreateReaction:
      case RequestEventType.RemoveReaction:
      case RequestEventType.RemoveFile:
      case RequestEventType.CreateFile: {
        this.checkSocialId(info.account, event.creator)
        return
      }
      case RequestEventType.RemoveNotifications:
      case RequestEventType.CreateNotificationContext:
      case RequestEventType.UpdateNotificationContext:
      case RequestEventType.RemoveNotificationContext: {
        this.checkAccount(info.account, event.account)
        return
      }
      case RequestEventType.CreateMessagesGroup:
      case RequestEventType.RemoveMessagesGroup: {
        this.onlySystemAccount(info.account)
        break
      }
      default:
        break
    }
  }

  private checkSocialId(account: Account, creator: SocialID): void {
    if (!account.socialIds.includes(creator) && systemAccountUuid !== account.uuid) {
      throw new Error('Forbidden')
    }
  }

  private checkAccount(account: Account, creator: AccountID): void {
    if (account.uuid !== creator && systemAccountUuid !== account.uuid) {
      throw new Error('Forbidden')
    }
  }

  private onlySystemAccount(account: Account): void {
    if (systemAccountUuid !== account.uuid) {
      throw new Error('Forbidden')
    }
  }
}
