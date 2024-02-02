<script lang="ts">
  import { Metrics } from '@hcengineering/core'
  import { Expandable } from '@hcengineering/ui'
  import { FixedColumn } from '@hcengineering/view-resources'

  export let metrics: Metrics
  export let level = 0
  export let name: string = 'System'

  $: haschilds = Object.keys(metrics.measurements).length > 0 || Object.keys(metrics.params).length > 0

  function showAvg (name: string, time: number, ops: number): string {
    if (name.startsWith('#')) {
      return `➿ ${time}`
    }
    if (ops === 0) {
      return `⏱️ ${time}`
    }
    return `${Math.floor((time / ops) * 100) / 100}`
  }
</script>

<Expandable
  expanded={level === 0}
  expandable={level !== 0 && haschilds}
  bordered
  showChevron={haschilds && level !== 0}
  contentColor
>
  <svelte:fragment slot="title">
    <div class="flex-row-center flex-between flex-grow ml-2">
      {name}
    </div>
  </svelte:fragment>
  <svelte:fragment slot="tools">
    <FixedColumn key="row">
      <div class="flex-row-center flex-between">
        <FixedColumn key="ops">
          <span class="p-1">
            {metrics.operations}
          </span>
        </FixedColumn>
        <FixedColumn key="time">
          <span class="p-1">
            {showAvg(name, metrics.value, metrics.operations)}
          </span>
        </FixedColumn>
        <FixedColumn key="time-full">
          <span class="p-1">
            {metrics.value}
          </span>
        </FixedColumn>
      </div>
    </FixedColumn>
  </svelte:fragment>
  {#each Object.entries(metrics.measurements) as [k, v], i (k)}
    <div style:margin-left={`${level * 0.5}rem`}>
      <svelte:self metrics={v} name="{i}. {k}" level={level + 1} />
    </div>
  {/each}
  {#each Object.entries(metrics.params) as [k, v], i}
    <div style:margin-left={`${level * 0.5}rem`}>
      {#each Object.entries(v).toSorted((a, b) => b[1].value / (b[1].operations + 1) - a[1].value / (a[1].operations + 1)) as [kk, vv]}
        <Expandable expandable={false} bordered showChevron={false} contentColor>
          <svelte:fragment slot="title">
            <div class="flex-row-center flex-between flex-grow">
              # {k} = {kk}
            </div>
          </svelte:fragment>
          <svelte:fragment slot="tools">
            <FixedColumn key="row">
              <div class="flex-row-center flex-between">
                <FixedColumn key="ops">{vv.operations}</FixedColumn>
                <FixedColumn key="time">{showAvg(kk, vv.value, vv.operations)}</FixedColumn>
                <FixedColumn key="time-full">{vv.value}</FixedColumn>
              </div>
            </FixedColumn>
          </svelte:fragment>
        </Expandable>
      {/each}
    </div>
  {/each}
</Expandable>
