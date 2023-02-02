<!--
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
-->
<script lang="ts">
  import core, { AttachedDoc, Doc, SortingOrder, TxCollectionCUD, TxCUD } from '@hcengineering/core'
  import { Issue } from '@hcengineering/tracker'
  import tracker from '../../plugin'
  import { List } from '@hcengineering/view-resources'
  import view from '@hcengineering/view'
  import { groupBy } from '@hcengineering/view-resources/src/utils'
  import ChangedObjectPresenter from './ChangedObjectPresenter.svelte'

  export let txes: TxCUD<Doc>[]
  export let onNavigate: () => void

  const TRACKED_OBJECTS = [
    tracker.class.Issue,
    tracker.class.IssueTemplate,
    tracker.class.Project,
    tracker.class.Sprint
  ] as const

  let changedObjectTxes: TxCUD<Doc>[] = []

  // Drop RemoveDoc Txes and filter by supported tracked objects
  $: filteredTxesCU = txes
    .filter((tx) => TRACKED_OBJECTS.includes(tx.objectClass))
    .filter((tx) => {
      if (tx.objectClass === tracker.class.Issue) {
        const issueTx = tx as TxCollectionCUD<Issue, AttachedDoc>
        return issueTx.tx.objectClass !== tracker.class.Issue || issueTx.tx._class !== core.class.TxRemoveDoc
      }
      return tx._class !== core.class.TxRemoveDoc
    })

  // Convert Issue txes to common model
  $: objectTxes = filteredTxesCU.map((tx) => {
    const objectTx = { ...tx }

    if (tx.objectClass === tracker.class.Issue) {
      const issueTx = tx as TxCollectionCUD<Issue, AttachedDoc>
      if (issueTx.tx.objectClass === tracker.class.Issue) {
        objectTx.objectId = issueTx.tx.objectId
        objectTx._class = issueTx.tx._class
      } else {
        objectTx._class = core.class.TxUpdateDoc
      }
    }

    return objectTx
  })

  // Retrieve single txes for changed objects: TxCreateDoc if it exist for object, else last TxUpdateDoc
  $: {
    changedObjectTxes = []

    const txesByObjectId = groupBy(objectTxes, 'objectId')

    Object.values(txesByObjectId).forEach((objectTxes) => {
      let objectTx: TxCUD<Doc> | undefined

      objectTxes.forEach((tx) => {
        const currentTx = tx as TxCUD<Doc>

        if (
          !objectTx ||
          currentTx._class === core.class.TxCreateDoc ||
          (objectTx._class === core.class.TxUpdateDoc && objectTx.modifiedOn < currentTx.modifiedOn)
        ) {
          objectTx = currentTx
        }
      })

      if (objectTx) {
        changedObjectTxes.push(objectTx)
      }
    })

    changedObjectTxes = changedObjectTxes.sort((leftObjectTx, rightObjectTx) =>
      leftObjectTx.objectClass.localeCompare(rightObjectTx.objectClass)
    )
  }
</script>

<List
  _class={core.class.TxCUD}
  documents={changedObjectTxes}
  config={[
    {
      key: '',
      presenter: ChangedObjectPresenter,
      props: { onNavigate }
    },
    { key: '', presenter: view.component.GrowPresenter, props: { type: 'grow' } },
    {
      key: 'modifiedOn',
      presenter: tracker.component.ModificationDatePresenter,
      props: {}
    }
  ]}
  viewOptions={{ orderBy: ['modifiedOn', SortingOrder.Descending], groupBy: ['_class'] }}
/>
