<script lang="ts">
  import type { PersonRating } from '@hcengineering/rating'

  export let rating: PersonRating | undefined

  // Sorted months
  $: months = [...(rating?.months ?? [])].sort((a, b) => a[0] - b[0])

  $: fullYears = Array.from(new Set(months.map((it) => Math.floor(it[0] / 100))))

  $: ymin = Math.min(...fullYears)
  $: ymax = Math.max(...fullYears)

  const monthMax: number = 500

  // Color scale: 0 = #ebedf0, low = #c6e48b, mid = #7bc96f, high = #239a3b, max = #196127
  function getColor (val: number, max: number): string {
    max = Math.max(max, monthMax)
    const COLORS = [
      'transparent',
      '#c6e48b',
      '#a0d16e',
      '#8ec760',
      '#7bc96f',
      '#6bb85e',
      '#5ba94d',
      '#4b9a3c',
      '#3b8b2b',
      '#2b7c1a',
      '#239a3b',
      '#1f7a2c',
      '#1b7820',
      '#177614',
      '#156c11',
      '#196127',
      '#144f0e'
    ]
    if (val <= 0) return COLORS[0]
    const idx = 1 + Math.min(COLORS.length - 2, Math.floor((val / max) * (COLORS.length - 1)))
    return COLORS[idx]
  }

  function getMax (year: number, rating?: PersonRating): number {
    const monthData = rating?.months?.filter((it) => Math.floor(it[0] / 100) === year)
    if (monthData === undefined) return monthMax
    return Math.max(...monthData.map((val) => (val[1] ?? 0) + (val[2] ?? 0) + (val[3] ?? 0)))
  }

  import ratingPlugin from '@hcengineering/rating'
  import { tooltip } from '@hcengineering/ui'

  // Formatter for localized month names (short form, e.g. 'Jan', 'Feb' or localized equivalent)
  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })
</script>

{#if rating}
  <div class="flex flex-col">
    <div class="rating-activities">
      <!-- Monthly grid -->
      {#each Array.from({ length: ymax - ymin + 1 }, (_, i) => i + ymin) as year}
        {@const ymonths = months.filter((it) => Math.floor(it[0] / 100) === year)}
        <div class="flex-row flex flex-col p-1">
          <div class="flex flex-grow justify-center">
            {year}
          </div>
          <div class="contribution-grid">
            {#each Array.from({ length: 12 }, (_, i) => i) as m, i}
              {@const monthval = year * 100 + m}
              {@const yval = ymonths.find((it) => it[0] === monthval)}
              {#if yval}
                {@const ops = (yval[1] ?? 0) + (yval[2] ?? 0) + (yval[3] ?? 0)}
                {@const monthLabel = monthFormatter.format(new Date(year, i, 1))}
                <div
                  class="contribution-cell"
                  use:tooltip={{ label: ratingPlugin.string.MonthOps, props: { month: monthLabel, ops: String(ops) } }}
                  style="background: {getColor(ops, getMax(year, rating))}"
                ></div>
              {:else}
                {@const monthLabel = monthFormatter.format(new Date(year, i, 1))}
                <div
                  class="contribution-cell"
                  use:tooltip={{ label: ratingPlugin.string.MonthNoOps, props: { month: monthLabel } }}
                  style="background: {getColor(0, monthMax)}"
                ></div>
              {/if}
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .rating-activities {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    margin-bottom: 1em;
    max-width: fit-content;
    max-height: fit-content;
  }
  .contribution-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    margin-bottom: 1em;
    max-width: fit-content;
    max-height: fit-content;
  }
  .contribution-cell {
    width: 100%;
    height: 10px;
    width: 10px;
    aspect-ratio: 1/1;
    border-radius: 2px;
    border: 1px solid #e0e0e0;
    transition: background 0.2s;
  }
</style>
