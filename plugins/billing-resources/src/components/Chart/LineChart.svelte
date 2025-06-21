<script lang="ts">
  import Line from './Line.svelte'
  import XAxis from './XAxis.svelte'
  import GridLines from './GridLines.svelte'
  import Crosshair from './Crosshair.svelte'
  import Point from './Point.svelte'

  export let data: { date: Date, value: number }[] = []

  let hoveredPoint = null

  const margin = {
    top: 10,
    right: 20,
    bottom: 30,
    left: 40
  }

  let width = 100
  $: height = 0.30 * width

  $: innerWidth = width - margin.left - margin.right
  $: innerHeight = height - margin.top - margin.bottom

  function onMouseMove (e: MouseEvent): void {
    /* const xCoordinate = xScale.invert(e.offsetX - margin.left)
    const index = bisectX(stats, xCoordinate)
    hoveredPoint = stats[index - 1] */
  }

  function onMouseLeave (e: MouseEvent): void {
    /*
    hoveredPoint = null
    {#if hoveredPoint}
        <Crosshair
          xAccessorScaled={xAccessorScaled(hoveredPoint)}
          yAccessorScaled={yAccessorScaled(hoveredPoint)}
          xLabel={xAccessor(hoveredPoint)}
          yLabel={yAccessor(hoveredPoint)}
          {innerHeight}
          {innerWidth}
        />
        <Point x={xAccessorScaled(hoveredPoint)} y={yAccessorScaled(hoveredPoint)}
        />
      {/if}

     */
  }
</script>

<div class="wrapper" bind:clientWidth={width}>
  <svg role="img" {width} {height} on:mousemove={onMouseMove} on:mouseleave={onMouseLeave}>
    <g transform={`translate(${margin.left}, ${margin.top})`}>
      <XAxis height={innerHeight} width={innerWidth} values={data.map((d) => d.value)} />
      <GridLines height={innerHeight} width={innerWidth} values={data.map((d) => d.value)} />
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
