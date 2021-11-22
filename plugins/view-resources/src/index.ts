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

import type { Doc } from '@anticrm/core'

import StringEditor from './components/StringEditor.svelte'
import StringPresenter from './components/StringPresenter.svelte'
import BooleanEditor from './components/BooleanEditor.svelte'
import BooleanPresenter from './components/BooleanPresenter.svelte'
import StatePresenter from './components/StatePresenter.svelte'
import TimestampPresenter from './components/TimestampPresenter.svelte'
import TableView from './components/TableView.svelte'
import Table from './components/Table.svelte'
import KanbanView from './components/KanbanView.svelte'

import { getClient, MessageBox } from '@anticrm/presentation'
import { showPopup } from '@anticrm/ui'
import {buildModel} from './utils'

export { Table }
export { buildModel } from './utils'

function Delete(object: Doc): void {
  showPopup(MessageBox, {
    label: 'Delete object',
    message: 'Do you want to delete this object?'
  }, undefined, (result) => {
    if (result) {
      const client = getClient()
      client.removeDoc(object._class, object.space, object._id)    
    }
  })
}

export default async () => ({
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
  },
  api: {
    buildModel
  }
})
