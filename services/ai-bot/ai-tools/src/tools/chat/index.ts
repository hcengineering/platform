//
// Copyright © 2026 TraceX SAS.
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

import { chatListTool } from './chat-list'
import { chatMarkReadTool } from './chat-mark-read'
import { chatMessagesTool } from './chat-messages'
import { chatUnreadTool } from './chat-unread'
import { chatSendTool } from './chat-send'
import { chatUnreadMessagesTool } from './chat-unread-messages'

export { chatListTool } from './chat-list'
export { chatMarkReadTool } from './chat-mark-read'
export { chatMessagesTool } from './chat-messages'
export { chatUnreadTool } from './chat-unread'
export { chatSendTool } from './chat-send'
export { chatUnreadMessagesTool } from './chat-unread-messages'
export * from './tool-ids'
export { ChatTypeSchema, ChatTargetSchema } from './schemas'
export type { ChatType } from './schemas'

export const chatTools = [
  chatListTool,
  chatMessagesTool,
  chatUnreadTool,
  chatSendTool,
  chatUnreadMessagesTool,
  chatMarkReadTool
]
