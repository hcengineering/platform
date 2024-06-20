<script lang="ts">
  import { Metrics } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { Button, IconArrowRight, ticker } from '@hcengineering/ui'
  import MetricsInfo from './statistics/MetricsInfo.svelte'

  const endpoint: string = getMetadata(login.metadata.AccountsUrl) ?? ''
  const token: string = getMetadata(presentation.metadata.Token) ?? ''

  async function fetchStats (time: number): Promise<void> {
    await fetch(endpoint + `/api/v1/statistics?token=${token}`, {})
      .then(async (json) => {
        data = await json.json()
        admin = data?.admin ?? false
      })
      .catch((err) => {
        console.error(err)
      })
  }
  let data: any

  let admin = false
  $: void fetchStats($ticker)
  $: metricsData = data?.metrics as Metrics | undefined
</script>

{#if data}
  <div class="flex-col p-4">
    <span>
      Mem: {data?.statistics?.memoryUsed} / {data?.statistics?.memoryTotal} CPU: {data?.statistics?.cpuUsage}
    </span>
  </div>
{/if}

{#if admin}
  <div class="flex flex-col">
    <div class="flex-row-center p-1">
      <div class="p-3">1.</div>
      <Button
        icon={IconArrowRight}
        label={getEmbeddedLabel('Wipe statistics')}
        on:click={() => {
          void fetch(endpoint + `/api/v1/manage?token=${token}&operation=wipe-statistics`, {
            method: 'PUT'
          }).then(async () => {
            await fetchStats(0)
          })
        }}
      />
    </div>
  </div>
{/if}
<div class="flex-column p-3 h-full" style:overflow="auto">
  {#if metricsData !== undefined}
    <MetricsInfo metrics={metricsData} />
  {/if}
</div>

<style lang="scss">
  .greyed {
    color: rgba(black, 0.5);
  }
</style>
