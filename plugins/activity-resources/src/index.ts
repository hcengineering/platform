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

import { Resources } from '@hcengineering/platform'
import chunter from '@hcengineering/chunter'
import attachment from '@hcengineering/attachment'
import Activity from './components/Activity.svelte'
import TxView from './components/TxView.svelte'
import { DisplayTx } from './activity'

export { TxView }

export * from './activity'

export function commentsFilter (txes: DisplayTx[]): DisplayTx[] {
  return txes.filter((tx) => tx.tx.objectClass === chunter.class.Comment)
}

export function backlinksFilter (txes: DisplayTx[]): DisplayTx[] {
  return txes.filter((tx) => tx.tx.objectClass === chunter.class.Backlink)
}

export function attachmentsFilter (txes: DisplayTx[]): DisplayTx[] {
  return txes.filter((tx) => tx.tx.objectClass === attachment.class.Attachment)
}

export default async (): Promise<Resources> => ({
  filter: {
    CommentsFilter: commentsFilter,
    BacklinksFilter: backlinksFilter,
    AttachmentsFilter: attachmentsFilter
  },
  component: {
    Activity
  }
})
