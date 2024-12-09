<script lang="ts">
  import core, { IdMap, Ref, Timestamp, Tx, TxCreateDoc, TxUpdateDoc, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, IssueStatus } from '@hcengineering/tracker'
  import { Label, Row, ticker } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import Duration from './Duration.svelte'
  import StatusPresenter from './StatusPresenter.svelte'

  export let issue: Issue
  export let accentHeader: boolean = false

  const query = createQuery()

  let txes: Tx[] = []

  interface WithTime {
    status: WithLookup<IssueStatus>
    duration: number
  }

  $: query.query(
    core.class.Tx,
    { objectId: issue._id },
    (res) => {
      txes = res
    },
    { sort: { modifiedOn: 1 } }
  )

  let displaySt: WithTime[] = []
  function updateStatus (txes: Tx[], statuses: IdMap<IssueStatus>, _: number): void {
    const result: WithTime[] = []

    let current: Ref<IssueStatus> | undefined
    let last: Timestamp = Date.now()
    for (const it of txes) {
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

<Row>
  <span class="label" class:fs-bold={accentHeader} class:content-dark-color={accentHeader}>
    <Label label={tracker.string.StatusHistory} />:
  </span>
</Row>
{#each displaySt as st}
  <StatusPresenter value={st.status} space={issue.space} />
  <Duration value={st.duration} />
{/each}
