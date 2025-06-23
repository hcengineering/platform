<script lang="ts">
  import { getUserTimezone } from '@hcengineering/ui'
  import value from '*.svelte'

  export let width: number
  export let height: number
  export let values: number[]
  export let minDistance = 80

  $: stepsCount = Math.floor(width / minDistance) + 1

  let minValue = 0
  let maxValue = 0
  let lineStep = 0
  let valueStep = 0

  function updateValues (stepsCount: number, values: number[]): void {
    minValue = values[0]
    maxValue = values[values.length - 1]
    valueStep = (maxValue - minValue) / (stepsCount - 1)
  }

  $: lineStep = width / (stepsCount - 1)
  $: updateValues(stepsCount, values)
</script>

<g transform={`translate(0 ${height})`}>
  {#each { length: stepsCount } as _, index}
    <g transform={`translate(${index * lineStep} 0)`}>
      <line y1={0} y2={6} stroke="#bdc3c7" />
      <text y={10} dy="1.0em" text-anchor="middle" fill="var(--theme-halfcontent-color)">
        {new Date(Math.round(minValue + valueStep * index)).toLocaleDateString('default', {
          timeZone: getUserTimezone(),
          day: 'numeric',
          month: 'numeric'
        })}
      </text>
    </g>
  {/each}
</g>
