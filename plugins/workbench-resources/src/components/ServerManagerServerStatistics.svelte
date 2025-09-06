<script lang="ts">
  import { FixedColumn } from '@hcengineering/view-resources'
  import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
  import presentation, { type OverviewStatistics } from '@hcengineering/presentation'
  import { Button, DropdownLabels, Expandable, IconArrowRight, ticker } from '@hcengineering/ui'
  import MetricsStats from './MetricsStats.svelte'

  const token: string = getMetadata(presentation.metadata.Token) ?? ''

  const endpoint = getMetadata(presentation.metadata.StatsUrl)

  async function fetchStats (time: number): Promise<void> {
    await fetch(endpoint + `/api/v1/overview?token=${token}`, {})
      .then(async (json) => {
        data = await json.json()
        admin = data?.admin ?? false
      })
      .catch((err) => {
        console.error(err)
      })
  }
  let data: OverviewStatistics | undefined

  let admin = false
  $: void fetchStats($ticker)

  export let sortingOrder: 'avg' | 'ops' | 'total' = 'ops'
  const sortOrder = [
    { id: 'avg', label: 'Average' },
    { id: 'ops', label: 'Operations' },
    { id: 'total', label: 'Total' }
  ]
</script>

{#if data}
  <div class="flex-col p-4">
    <span>
      Connections: {data.connectionsTotal}
      Users: {data.usersTotal}
    </span>
    <span> </span>
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
{#if data}
  <div class="p-1 flex flex-grow flex-reverse">
    <DropdownLabels bind:selected={sortingOrder} items={sortOrder}></DropdownLabels>
  </div>
  <div class="flex-column p-3 h-full" style:overflow="auto">
    {#each Object.entries(data.data).sort((a, b) => a[1].serviceName.localeCompare(b[1].serviceName)) as kv}
      <Expandable bordered expandable showChevron>
        <svelte:fragment slot="title">
          <div class="ml-2">
            {kv[1].serviceName} - {kv[0]}
          </div>
        </svelte:fragment>
        <svelte:fragment slot="tools">
          <div class="flex flex-between flex-grow">
            <FixedColumn key="mem-usage">
              {kv[1].memory.memoryUsed}/{kv[1].memory.memoryTotal} Mb
            </FixedColumn>
            <FixedColumn key="mem-rss">
              {kv[1].memory.memoryRSS} Mb
            </FixedColumn>
            <FixedColumn key="cpu-usage">
              <div class="ml-2">
                {kv[1].cpu.usage}%
              </div>
            </FixedColumn>
          </div>
        </svelte:fragment>
        <MetricsStats serviceName={kv[0]} sortOrder={sortingOrder} />
      </Expandable>
    {/each}
  </div>
{/if}

<style lang="scss">
  .greyed {
    color: rgba(black, 0.5);
  }
</style>
