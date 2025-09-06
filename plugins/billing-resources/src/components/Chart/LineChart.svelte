<script lang="ts">
  import Line from './Line.svelte'
  import XAxis from './XAxis.svelte'
  import GridLines from './GridLines.svelte'

  export let valueFormatter: (value: number) => Promise<string>
  export let data: { date: number, value: number }[] = []

  const margin = {
    top: 20,
    right: 20,
    bottom: 30,
    left: 60
  }

  let width = 100
  $: height = 0.3 * width

  $: innerWidth = width - margin.left - margin.right
  $: innerHeight = height - margin.top - margin.bottom
</script>

<div class="wrapper" bind:clientWidth={width}>
  <svg role="img" {width} {height}>
    <g transform={`translate(${margin.left}, ${margin.top})`}>
      <XAxis height={innerHeight} width={innerWidth} values={data.map((d) => d.date)} />
      <GridLines height={innerHeight} width={innerWidth} {valueFormatter} values={data.map((d) => d.value)} />
      <Line height={innerHeight} width={innerWidth} {data} />
    </g>
  </svg>
</div>

<style>
  .wrapper {
    position: relative;
    width: 100%;
  }
</style>
