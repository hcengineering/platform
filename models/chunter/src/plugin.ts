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

import { Channel, chunterId } from '@anticrm/chunter'
import chunter from '@anticrm/chunter-resources/src/plugin'
import type { IntlString } from '@anticrm/platform'
import { mergeIds } from '@anticrm/platform'
import type { Ref } from '@anticrm/core'
import { ViewletDescriptor } from '@anticrm/view'
import type { AnyComponent } from '@anticrm/ui'
import type { TxViewlet } from '@anticrm/activity'
import { Application } from '@anticrm/workbench'

export default mergeIds(chunterId, chunter, {
  component: {
    CommentsPresenter: '' as AnyComponent,
    CommentPresenter: '' as AnyComponent
  },
  string: {
    ApplicationLabelChunter: '' as IntlString,
    LeftComment: '' as IntlString
  },
  viewlet: {
    Chat: '' as Ref<ViewletDescriptor>
  },
  ids: {
    TxCommentCreate: '' as Ref<TxViewlet>,
    TxCommentRemove: '' as Ref<TxViewlet>
  },
  activity: {
    TxCommentCreate: '' as AnyComponent
  },
  space: {
    General: '' as Ref<Channel>,
    Random: '' as Ref<Channel>
  },
  app: { Chunter: '' as Ref<Application> }
})
