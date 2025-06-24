<script lang="ts">
  export let valueFormatter: (value: number) => Promise<string>
  export let height: number
  export let width: number
  export let values: number[]
  export let minDistance = 40

  let minValue = 0
  let maxValue = 0
  let stepsCount = 3
  let lineStep = 0
  let valueStep = 0

  function updateValues (values: number[], height: number, minDistance: number): void {
    stepsCount = Math.floor(height / minDistance)
    minValue = Math.min.apply(Math, values)
    maxValue = Math.max.apply(Math, values)
    if (maxValue === minValue) {
      maxValue += 1000000
    }
    stepsCount = Math.max(stepsCount, 2)
    lineStep = height / (stepsCount - 1)
    valueStep = (maxValue - minValue) / (stepsCount - 1)
  }

  $: updateValues(values, height, minDistance)
</script>

<g>
  {#each { length: stepsCount } as _, index}
    <g transform={`translate(0 ${height - index * lineStep})`}>
      <line x1={0} x2={width} stroke="#bdc3c7" stroke-opacity="0.5" />
      <text dx="-0.8em" dy="0.34em" text-anchor="end" fill="var(--theme-halfcontent-color)">
        {#await valueFormatter(Math.round(minValue + valueStep * index)) then value}
          {value}
        {/await}
      </text>
    </g>
  {/each}
</g>
