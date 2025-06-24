<script lang="ts">
  import LineChart from './Chart/LineChart.svelte'
  import { Label } from '@hcengineering/ui'
  import type { IntlString } from '@hcengineering/platform'

  export let label: IntlString
  export let valueFormatter: (value: number) => Promise<string> = (value) => Promise.resolve(value.toString())
  export let data: { date: number, value: number }[] = []

  let normalizedData: { date: number, value: number }[] = []

  function normalizeData (data: { date: number, value: number }[]): void {
    const startDate = new Date(Date.now())
    startDate.setHours(0, 0, 0, 0)
    startDate.setDate(startDate.getDate() - 29)
    normalizedData = []
    for (let i = 0; i < 30; i++) {
      const value = data.find((d) => d.date === startDate.getTime())?.value ?? 0
      normalizedData.push({ date: startDate.getTime(), value })
      startDate.setDate(startDate.getDate() + 1)
    }
  }

  $: normalizeData(data)
</script>

<div class="flex-col clear-mins stats-big-card" {...$$restProps}>
  <div class="flex-row-center">
    <span class="fs-title">
      <Label {label} />
    </span>
  </div>
  <div class="my-3 flex-grow flex-center stats">
    <LineChart {valueFormatter} data={normalizedData} />
  </div>
</div>

<style lang="scss">
  .stats-big-card {
    flex: 2 0 calc(100% - 16px);
    min-width: 24rem;
    min-height: 10rem;
    padding: 20px;
    box-sizing: border-box;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.5rem;

    display: flex;

    overflow: hidden;
    word-break: break-word;
  }
</style>
