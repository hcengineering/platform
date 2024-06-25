<script lang="ts">
  import { Metrics } from '@hcengineering/core'
  import { getMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { ticker } from '@hcengineering/ui'
  import MetricsInfo from './statistics/MetricsInfo.svelte'

  const token: string = getMetadata(presentation.metadata.Token) ?? ''

  async function fetchUIStats (time: number): Promise<void> {
    await fetch(`/api/v1/statistics?token=${token}`, {})
      .then(async (json) => {
        dataFront = await json.json()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  let dataFront: any
  $: void fetchUIStats($ticker)
  $: metricsDataFront = dataFront?.metrics as Metrics | undefined
</script>

<div class="flex-column p-3 h-full" style:overflow="auto">
  {#if metricsDataFront !== undefined}
    <MetricsInfo metrics={metricsDataFront} />
  {/if}
</div>

<style lang="scss">
  .greyed {
    color: rgba(black, 0.5);
  }
</style>
