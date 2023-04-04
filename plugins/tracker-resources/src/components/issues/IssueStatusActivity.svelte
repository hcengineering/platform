<script lang="ts">
  import core, { Ref, Timestamp, Tx, TxCollectionCUD, TxCreateDoc, TxUpdateDoc, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, IssueStatus } from '@hcengineering/tracker'
  import { Label, ticker } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { statusStore } from '@hcengineering/presentation'
  import Duration from './Duration.svelte'
  import StatusPresenter from './StatusPresenter.svelte'

  export let issue: Issue

  const query = createQuery()

  let txes: Tx[] = []

  interface WithTime {
    status: WithLookup<IssueStatus>
    duration: number
  }

  $: query.query(
    core.class.Tx,
    { 'tx.objectId': issue._id },
    (res) => {
      txes = res
    },
    { sort: { modifiedOn: 1 } }
  )

  let displaySt: WithTime[] = []
  async function updateStatus (
    txes: Tx[],
    statuses: Map<Ref<IssueStatus>, WithLookup<IssueStatus>>,
    _: number
  ): Promise<void> {
    const result: WithTime[] = []

    let current: Ref<IssueStatus> | undefined
    let last: Timestamp = Date.now()
    for (let it of txes) {
      if (it._class === core.class.TxCollectionCUD) {
        it = (it as TxCollectionCUD<Issue, Issue>).tx
      }
      let newStatus: Ref<IssueStatus> | undefined
      if (it._class === core.class.TxCreateDoc) {
        const op = it as TxCreateDoc<Issue>
        if (op.attributes.status !== undefined) {
          newStatus = op.attributes.status
          last = it.modifiedOn
        }
      }
      if (it._class === core.class.TxUpdateDoc) {
        const op = it as TxUpdateDoc<Issue>
        if (op.operations.status !== undefined) {
          newStatus = op.operations.status
        }
      }
      if (current === undefined) {
        current = newStatus
        last = it.modifiedOn
      } else if (current !== newStatus && newStatus !== undefined) {
        let stateValue = result.find((it) => it.status?._id === current)
        if (stateValue === undefined) {
          stateValue = { status: statuses.get(current) as IssueStatus, duration: 0 }
          result.push(stateValue)
        }
        stateValue.duration += it.modifiedOn - last
        current = newStatus
        last = it.modifiedOn
      }
    }
    if (current !== undefined) {
      let stateValue = result.find((it) => it.status?._id === current)
      if (stateValue === undefined) {
        stateValue = { status: statuses.get(current) as IssueStatus, duration: 0 }
        result.push(stateValue)
      }
      stateValue.duration += Date.now() - last
    }

    result.sort((a, b) => b.duration - a.duration)
    displaySt = result
  }

  $: updateStatus(txes, $statusStore.byId, $ticker)
</script>

<div class="flex-row mt-4 mb-4">
  <Label label={tracker.string.StatusHistory} />:
  <table class="ml-2">
    {#each displaySt as st}
      <tr>
        <td class="flex-row-center mt-2 mb-2">
          <StatusPresenter value={st.status} />
        </td>
        <td>
          <div class="ml-2 mr-2">
            <Duration value={st.duration} />
          </div>
        </td>
      </tr>
    {/each}
  </table>
</div>
