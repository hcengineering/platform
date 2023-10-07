//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Class, Doc, DocumentQuery, FindOptions, FindResult, Hierarchy, Ref } from '@hcengineering/core'
import type { Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { TriggerFunc } from '@hcengineering/server-core'
import { Presenter, TypeMatchFunc, NotificationContentProvider } from '@hcengineering/server-notification'

/**
 * @public
 */
export const serverChunterId = 'server-chunter' as Plugin

/**
 * @public
 */
export default plugin(serverChunterId, {
  trigger: {
    BacklinkTrigger: '' as Resource<TriggerFunc>,
    ChunterTrigger: '' as Resource<TriggerFunc>,
    OnMessageSent: '' as Resource<TriggerFunc>
  },
  function: {
    CommentRemove: '' as Resource<
    (
      doc: Doc,
      hiearachy: Hierarchy,
      findAll: <T extends Doc>(
        clazz: Ref<Class<T>>,
        query: DocumentQuery<T>,
        options?: FindOptions<T>
      ) => Promise<FindResult<T>>
    ) => Promise<Doc[]>
    >,
    ChannelHTMLPresenter: '' as Resource<Presenter>,
    ChannelTextPresenter: '' as Resource<Presenter>,
    IsDirectMessage: '' as TypeMatchFunc,
    IsChannelMessage: '' as TypeMatchFunc,
    IsThreadMessage: '' as TypeMatchFunc,
    IsMeMentioned: '' as TypeMatchFunc,
    ChunterNotificationContentProvider: '' as Resource<NotificationContentProvider>
  }
})
