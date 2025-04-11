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
import {
  type ConnectionInfo,
  LabelRequestEventType,
  MessageRequestEventType,
  NotificationRequestEventType,
  type RequestEvent
} from '@hcengineering/communication-sdk-types'
import { type Account, systemAccountUuid } from '@hcengineering/core'

export class Permissions {
  validate(info: ConnectionInfo, event: RequestEvent): void {
    switch (event.type) {
      case MessageRequestEventType.CreateMessage:
      case MessageRequestEventType.CreatePatch:
      case MessageRequestEventType.CreateReaction:
      case MessageRequestEventType.RemoveReaction:
      case MessageRequestEventType.RemoveFile:
      case MessageRequestEventType.CreateFile: {
        this.checkSocialId(info.account, event.creator)
        return
      }
      case LabelRequestEventType.CreateLabel:
      case LabelRequestEventType.RemoveLabel:
      case NotificationRequestEventType.RemoveNotifications:
      case NotificationRequestEventType.CreateNotificationContext:
      case NotificationRequestEventType.UpdateNotificationContext:
      case NotificationRequestEventType.RemoveNotificationContext: {
        this.checkAccount(info.account, event.account)
        return
      }
      case MessageRequestEventType.CreateMessagesGroup:
      case MessageRequestEventType.RemoveMessagesGroup: {
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
