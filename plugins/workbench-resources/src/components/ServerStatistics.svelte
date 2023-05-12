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
    <div class="flex-column">
      {#each Object.entries(data.statistics?.activeSessions) as act}
        <span class="flex-row-center">
          {act[0]}: {act[1]}
        </span>
      {/each}
    </div>

    <span class="fs-title flex-row-center">
      Memory usage: {data.statistics.memoryUsed} / {data.statistics.memoryTotal}
    </span>
    <span class="fs-title flex-row-center">
      CPU: {data.statistics.cpuUsage}
    </span>
    <span class="fs-title flex-row-center">
      Mem: {data.statistics.freeMem} / {data.statistics.totalMem}
    </span>

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
