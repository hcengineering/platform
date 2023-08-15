//
// Copyright © 2023 Hardcore Engineering Inc.
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

export type IntercomWebhookNotification =
  | IntercomWebhookNotificationConverstaionAdminReplied
  | IntercomWebhookNotificationConverstaionRead

export interface IntercomWebhookNotificationConverstaionAdminReplied {
  data: {
    type: 'notification_event_data'
    item: IntercomConversationNotificationData
  }
  topic: 'conversation.admin.replied'
  type: 'notification_event'
}

export interface IntercomWebhookNotificationConverstaionRead {
  data: {
    type: 'notification_event_data'
    item: IntercomConversationNotificationData
  }
  topic: 'conversation.read'
  type: 'notification_event'
}

export interface IntercomConversationNotificationData {
  id: string
  contacts: {
    type: 'contact.list'
    contacts: {
      id: string
      type: 'contact'
    }[]
  }
  type: 'conversation'
}
