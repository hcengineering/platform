<script lang="ts">
  export let height: number
  export let width: number
  export let values: number[]
  export let minDistance = 60

  $: stepsCount = Math.floor(height / minDistance) + 1

  $: minValue = Math.min.apply(Math, values)
  $: maxValue = Math.max.apply(Math, values)
  $: lineStep = height / (stepsCount - 1)
  $: valueStep = (maxValue - minValue) / (stepsCount - 1)
</script>

<g>
  {#each { length: stepsCount } as _, index}
    <g transform={`translate(0 ${height - index * lineStep})`}>
      <line x1={0} x2={width} stroke='#bdc3c7' stroke-opacity='0.5' />
      <text dx="-0.8em" dy="0.34em" text-anchor="end" fill="var(--theme-halfcontent-color)">
        {Math.round(minValue + valueStep * index)}
      </text>
    </g>
  {/each}
</g>
