<script lang="ts">
  export let width: number
  export let height: number
  export let values: number[]
  export let minDistance = 60

  $: stepsCount = Math.floor(width / minDistance) + 1

  $: minValue = Math.min.apply(Math, values)
  $: maxValue = Math.max.apply(Math, values)
  $: lineStep = width / (stepsCount - 1)
  $: valueStep = (maxValue - minValue) / (stepsCount - 1)
</script>

<g transform={`translate(0 ${height})`}>
  {#each { length: stepsCount } as _, index}
    <g transform={`translate(${index * lineStep} 0)`}>
      <line y1={0} y2={6} stroke='#bdc3c7' />
      <text y={10} dy="1.0em" text-anchor="middle" fill="var(--theme-halfcontent-color)">
        {Math.round(minValue + valueStep * index)}
      </text>
    </g>
  {/each}
</g>
