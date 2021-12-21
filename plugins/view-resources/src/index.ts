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
import { Resources } from '@anticrm/platform'
import { getClient, MessageBox } from '@anticrm/presentation'
import { showPopup } from '@anticrm/ui'
import BooleanEditor from './components/BooleanEditor.svelte'
import BooleanPresenter from './components/BooleanPresenter.svelte'
import DateEditor from './components/DateEditor.svelte'
import DatePresenter from './components/DatePresenter.svelte'
import StringEditor from './components/StringEditor.svelte'
import StringPresenter from './components/StringPresenter.svelte'
import Table from './components/Table.svelte'
import TableView from './components/TableView.svelte'
import TimestampPresenter from './components/TimestampPresenter.svelte'
import { deleteObject } from './utils'
import MoveView from './components/Move.svelte'

export { default as ContextMenu } from './components/Menu.svelte'
export { buildModel, getActions, getObjectPresenter } from './utils'
export { Table, TableView }

function Delete (object: Doc): void {
  showPopup(
    MessageBox,
    {
      label: 'Delete object',
      message: 'Do you want to delete this object?'
    },
    undefined,
    (result) => {
      if (result) {
        deleteObject(getClient(), object)
      }
    }
  )
}

async function Move (object: Doc): Promise<void> {
  showPopup(MoveView, { object })
}

export default async (): Promise<Resources> => ({
  actionImpl: {
    Delete: {
      apply: Delete
    },
    Move: {
      apply: Move
    }
  },
  component: {
    StringEditor,
    StringPresenter,
    BooleanPresenter,
    BooleanEditor,
    TableView,
    TimestampPresenter,
    DateEditor,
    DatePresenter
  }
})
