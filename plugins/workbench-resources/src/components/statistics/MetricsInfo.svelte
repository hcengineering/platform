<script lang="ts">
  import { Metrics, type MetricsData } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Button, Expandable, showPopup } from '@hcengineering/ui'
  import { FixedColumn } from '@hcengineering/view-resources'
  import Params from './Params.svelte'

  export let metrics: Metrics
  export let level = 0
  export let name: string = 'System'
  export let sortOrder: 'avg' | 'ops' | 'total'

  $: haschilds =
    Object.keys(metrics.measurements).length > 0 ||
    Object.keys(metrics.params).length > 0 ||
    (metrics.topResult?.length ?? 0) > 0

  function showAvg (name: string, time: number, ops: number): string {
    if (name.startsWith('#')) {
      return `➿ ${time}`
    }
    if (ops === 0) {
      return `⏱️ ${time}`
    }
    return `${Math.floor((time / ops) * 100) / 100}`
  }
  const getSorted = (v: Record<string, MetricsData>, sortingOrder: 'avg' | 'ops' | 'total') => {
    if (sortingOrder === 'avg') {
      return Object.entries(v).sort((a, b) => b[1].value / (b[1].operations + 1) - a[1].value / (a[1].operations + 1))
    } else if (sortingOrder === 'ops') {
      return Object.entries(v).sort((a, b) => b[1].operations + 1 - (a[1].operations + 1))
    } else {
      return Object.entries(v).sort((a, b) => b[1].value - a[1].value)
    }
  }

  function getSortedMeasurements (
    m: Record<string, Metrics>,
    sortingOrder: 'avg' | 'ops' | 'total'
  ): [string, Metrics][] {
    const ms = [...Object.entries(m)]
    if (sortingOrder === 'avg') {
      ms.sort((a, b) => b[1].value / (b[1].operations + 1) - a[1].value / (a[1].operations + 1))
    } else if (sortingOrder === 'ops') {
      ms.sort((a, b) => b[1].operations + 1 - (a[1].operations + 1))
    } else {
      ms.sort((a, b) => b[1].value - a[1].value)
    }
    return ms
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
    {@const params = JSON.stringify(metrics.namedParams ?? {})}
    <div class="flex-row-center flex-between flex-grow ml-2">
      {name}
      {#if params !== '{}'}
        <Button
          label={getEmbeddedLabel('*')}
          on:click={() => {
            showPopup(Params, { params: metrics.namedParams ?? {}, opLog: metrics.opLog }, 'full')
          }}
          kind={'ghost'}
        />
      {/if}
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
  {#if metrics.topResult !== undefined && metrics.topResult.length > 0 && metrics.topResult[0].value > 0 && Object.keys(metrics.topResult[0].params).length > 0}
    <div class="p-1" style:margin-left={`${level * 0.5 + 0.5}rem`}>
      <Expandable>
        <svelte:fragment slot="title">
          <div class="flex-row-center flex-between flex-grow ml-2">
            Slowest result:{metrics.topResult[0].value}
          </div>
        </svelte:fragment>
        {#each metrics.topResult ?? [] as r}
          <Expandable>
            <svelte:fragment slot="title">
              <div class="flex-row-center flex-between flex-grow select-text">
                Time:{r.value}
              </div>
            </svelte:fragment>
            <pre class="select-text">
              {JSON.stringify(r, null, 2)}
            </pre>
          </Expandable>
        {/each}
      </Expandable>
    </div>
  {/if}
  {#each getSortedMeasurements(metrics.measurements, sortOrder) as [k, v], i (k)}
    <div style:margin-left={`${level * 0.5}rem`}>
      <svelte:self metrics={v} name="{i}. {k}" level={level + 1} {sortOrder} />
    </div>
  {/each}
  {#each Object.entries(metrics.params) as [k, v]}
    <div style:margin-left={`${level * 0.5}rem`}>
      {#each getSorted(v, sortOrder) as [kk, vv]}
        {@const childExpandable =
          vv.topResult !== undefined &&
          vv.topResult.length > 0 &&
          vv.topResult[0].value > 0 &&
          Object.keys(vv.topResult[0].params).length > 0}
        <Expandable expandable={childExpandable} bordered showChevron={childExpandable} contentColor>
          <svelte:fragment slot="title">
            <div class="flex-row-center flex-between flex-grow">
              # {k} = {kk}
            </div>
          </svelte:fragment>
          <svelte:fragment slot="tools">
            <FixedColumn key="row">
              <div class="flex-row-center flex-between">
                <FixedColumn key="ops">{vv.operations}</FixedColumn>
                <FixedColumn key="time">
                  {showAvg(kk, vv.value, vv.operations)}
                </FixedColumn>
                <FixedColumn key="time-full">{vv.value}</FixedColumn>
              </div>
            </FixedColumn>
          </svelte:fragment>
          {#if childExpandable}
            <div class="p-1" style:margin-left={`${level * 0.5 + 0.5}rem`}>
              {#each vv.topResult ?? [] as r}
                <Expandable>
                  <svelte:fragment slot="title">
                    <div class="flex-row-center flex-between flex-grow">
                      Time:{r.value}
                    </div>
                  </svelte:fragment>
                  <pre class="select-text">
                    {JSON.stringify(r, null, 2)}
                  </pre>
                </Expandable>
              {/each}
            </div>
          {/if}
        </Expandable>
      {/each}
    </div>
  {/each}
</Expandable>
