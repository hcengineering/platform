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

import { chatId } from '@hcengineering/chat'
import chat from '@hcengineering/chat-resources/src/plugin'
import { type Ref } from '@hcengineering/core'
import { type Application } from '@hcengineering/model-workbench'
import { mergeIds } from '@hcengineering/platform'

export default mergeIds(chatId, chat, {
  app: {
    Chat: '' as Ref<Application>
  }
})
