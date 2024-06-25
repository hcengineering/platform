<script lang="ts">
  import { Metrics } from '@hcengineering/core'
  import { getMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { ticker } from '@hcengineering/ui'
  import MetricsInfo from './statistics/MetricsInfo.svelte'

  const token: string = getMetadata(presentation.metadata.Token) ?? ''

  async function fetchCollabStats (tick: number): Promise<void> {
    const collaborator = getMetadata(presentation.metadata.CollaboratorApiUrl)
    await fetch(collaborator + `/api/v1/statistics?token=${token}`, {})
      .then(async (json) => {
        dataCollab = await json.json()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  let dataCollab: any
  $: void fetchCollabStats($ticker)
  $: metricsDataCollab = dataCollab?.metrics as Metrics | undefined
</script>

<div class="flex-column p-3 h-full" style:overflow="auto">
  {#if metricsDataCollab !== undefined}
    <MetricsInfo metrics={metricsDataCollab} />
  {/if}
</div>

<style lang="scss">
  .greyed {
    color: rgba(black, 0.5);
  }
</style>
