<script lang="ts">
  export let data: { date: number, value: number }[] = []
  export let width: number
  export let height: number

  function createLines (
    data: { date: number, value: number }[],
    width: number,
    height: number
  ): { x1: number, y1: number, x2: number, y2: number }[] {
    const result: { x1: number, y1: number, x2: number, y2: number }[] = []
    const stepX = width / (data.length - 1)
    const minValue = Math.min.apply(
      Math,
      data.map((d) => d.value)
    )
    let maxValue = Math.max.apply(
      Math,
      data.map((d) => d.value)
    )
    if (maxValue === minValue) {
      maxValue += 10000
    }

    for (let i = 1; i < data.length; i++) {
      const line = {
        x1: stepX * (i - 1),
        y1: height - height * (data[i - 1].value / (maxValue - minValue)),
        x2: stepX * i,
        y2: height - height * (data[i].value / (maxValue - minValue))
      }
      result.push(line)
    }
    return result
  }

  $: lines = createLines(data, width, height)
</script>

{#each lines as line}
  <line x1={line.x1} x2={line.x2} y1={line.y1} y2={line.y2} class="line" />
{/each}

<style>
  .line {
    fill: none;
    stroke: var(--theme-state-primary-color);
    stroke-width: 3px;
    stroke-linecap: round;
  }
</style>
