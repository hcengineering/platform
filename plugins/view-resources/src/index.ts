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

import type { AttachedDoc, Doc } from '@anticrm/core'
import core from '@anticrm/core'
import { Resources } from '@anticrm/platform'
import { getClient, MessageBox } from '@anticrm/presentation'
import { showPopup } from '@anticrm/ui'
import BooleanEditor from './components/BooleanEditor.svelte'
import BooleanPresenter from './components/BooleanPresenter.svelte'
import KanbanView from './components/KanbanView.svelte'
import StatePresenter from './components/StatePresenter.svelte'
import StringEditor from './components/StringEditor.svelte'
import StringPresenter from './components/StringPresenter.svelte'
import Table from './components/Table.svelte'
import TableView from './components/TableView.svelte'
import TimestampPresenter from './components/TimestampPresenter.svelte'

export { buildModel, getObjectPresenter } from './utils'
export { Table }

function Delete (object: Doc): void {
  showPopup(
    MessageBox,
    {
      label: 'Delete object',
      message: 'Do you want to delete this object?'
    },
    undefined,
    (result: boolean) => {
      if (result) {
        const client = getClient()
        if (client.getHierarchy().isDerived(object._class, core.class.AttachedDoc)) {
          const adoc = object as AttachedDoc
          client
            .removeCollection(
              object._class,
              object.space,
              adoc._id,
              adoc.attachedTo,
              adoc.attachedToClass,
              adoc.collection
            )
            .catch((err) => console.log(err))
        } else {
          client.removeDoc(object._class, object.space, object._id).catch((err) => console.log(err))
        }
      }
    }
  )
}

export default async (): Promise<Resources> => ({
  actionImpl: {
    Delete
  },
  component: {
    StringEditor,
    StringPresenter,
    BooleanPresenter,
    BooleanEditor,
    StatePresenter,
    TableView,
    KanbanView,
    TimestampPresenter
  }
})
