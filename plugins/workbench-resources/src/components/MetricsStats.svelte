<script lang="ts">
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { type ServiceStatistics } from '@hcengineering/presentation'
  import { ticker } from '@hcengineering/ui'
  import MetricsInfo from './statistics/MetricsInfo.svelte'

  export let serviceName: string
  export let sortOrder: 'ops' | 'avg' | 'total'

  const endpoint = getMetadata(presentation.metadata.StatsUrl)
  const token: string = getMetadata(presentation.metadata.Token) ?? ''

  async function fetchStats (time: number): Promise<void> {
    await fetch(endpoint + `/api/v1/statistics?token=${token}&name=${serviceName}`, {})
      .then(async (json) => {
        data = await json.json()
      })
      .catch((err) => {
        console.error(err)
      })
  }
  let data: ServiceStatistics | undefined

  $: void fetchStats($ticker)
  $: metricsData = data?.stats
</script>

<div class="flex-column p-3 h-full" style:overflow="auto">
  {#if metricsData !== undefined}
    <MetricsInfo metrics={metricsData} {sortOrder} />
  {/if}
</div>

<style lang="scss">
  .greyed {
    color: rgba(black, 0.5);
  }
</style>
