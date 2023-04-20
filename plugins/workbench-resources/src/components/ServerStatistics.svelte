<script lang="ts">
  import { metricsToRows } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Card } from '@hcengineering/presentation'
  import { ticker } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'

  export let endpoint: string

  let data: any

  onDestroy(
    ticker.subscribe(() => {
      fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(async (json) => {
        data = await json.json()
      })
    })
  )
</script>

<Card on:close fullSize label={getEmbeddedLabel('Statistics')} okAction={() => {}} okLabel={getEmbeddedLabel('Ok')}>
  {#if data}
    {JSON.stringify(data.activeSessions, null, 2)}
    <table class="antiTable" class:highlightRows={true}>
      <thead class="scroller-thead">
        <tr>
          <th>Name</th>
          <th>Average</th>
          <th>Total</th>
          <th>Ops</th>
        </tr>
      </thead>
      <tbody>
        {#each metricsToRows(data.metrics, 'System') as row}
          <tr class="antiTable-body__row">
            <td>
              <span style={`padding-left: ${row[0]}rem;`}>
                {row[1]}
              </span>
            </td>
            <td>{row[2]}</td>
            <td>{row[3]}</td>
            <td>{row[4]}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</Card>
