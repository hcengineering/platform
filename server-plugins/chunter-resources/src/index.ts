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

import chunter, { Comment, Channel } from '@anticrm/chunter'
import { Class, Doc, DocumentQuery, FindOptions, FindResult, Hierarchy, Ref } from '@anticrm/core'
import login from '@anticrm/login'
import { getMetadata } from '@anticrm/platform'
import workbench from '@anticrm/workbench'

/**
 * @public
 */
export function channelHTMLPresenter (doc: Doc): string {
  const channel = doc as Channel
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbench.component.WorkbenchApp}/${chunter.app.Chunter}/${channel._id}">${channel.name}</a>`
}

/**
 * @public
 */
export function channelTextPresenter (doc: Doc): string {
  const channel = doc as Channel
  return `${channel.name}`
}

/**
 * @public
 */
export async function CommentRemove (doc: Doc, hiearachy: Hierarchy, findAll: <T extends Doc> (clazz: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>) => Promise<FindResult<T>>): Promise<Doc[]> {
  if (!hiearachy.isDerived(doc._class, chunter.class.Comment)) {
    return []
  }

  const comment = doc as Comment
  const result = await findAll(chunter.class.Backlink, { backlinkId: comment.attachedTo, backlinkClass: comment.attachedToClass, attachedDocId: comment._id })
  return result
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    CommentRemove,
    ChannelHTMLPresenter: channelHTMLPresenter,
    ChannelTextPresenter: channelTextPresenter
  }
})
