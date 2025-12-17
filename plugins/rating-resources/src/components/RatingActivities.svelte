<script lang="ts">
  import type { PersonRating } from '@hcengineering/rating'

  export let rating: PersonRating | undefined

  // Sorted months
  $: months = [...(rating?.months ?? [])].sort((a, b) => a[0] - b[0])

  $: fullYears = Array.from(new Set(months.map((it) => Math.floor(it[0] / 100))))

  $: ymin = Math.min(...fullYears)
  $: ymax = Math.max(...fullYears)

  // Calculate total operations per month (log-scaled for better differentiation)
  $: monthOps = (() => {
    const map = new Map<number, number>()
    months.forEach((m) => {
      const ops = (m[1] ?? 0) + (m[2] ?? 0) + (m[3] ?? 0)
      // Use log1p (log(1+x)) for better handling of small values
      map.set(m[0], ops > 0 ? Math.log1p(ops) : 0)
    })
    return map
  })()

  // Calculate softmax values per year (within each year's months) using log-scaled values
  $: yearSoftmaxMaps = (() => {
    const maps = new Map<number, Map<number, number>>()

    fullYears.forEach((year) => {
      const yearMonths = months.filter((m) => Math.floor(m[0] / 100) === year)
      const logOps = yearMonths.map((m) => monthOps.get(m[0]) ?? 0)
      const softmaxValues = softmax(logOps, 1.0) // temperature = 1.0 for moderate differentiation

      const monthMap = new Map<number, number>()
      yearMonths.forEach((m, i) => {
        monthMap.set(m[0], softmaxValues[i])
      })
      maps.set(year, monthMap)
    })

    return maps
  })()

  // Store year totals for display
  $: yearTotals = (() => {
    const map = new Map<number, number>()
    fullYears.forEach((year) => {
      const yearMonths = months.filter((m) => Math.floor(m[0] / 100) === year)
      const total = yearMonths.reduce((sum, m) => sum + (m[1] ?? 0) + (m[2] ?? 0) + (m[3] ?? 0), 0)
      map.set(year, total)
    })
    return map
  })()

  // Calculate year-over-year growth rate (level rise)
  $: yearGrowth = (() => {
    const map = new Map<number, number>()
    for (let i = 0; i < fullYears.length; i++) {
      const year = fullYears[i]
      const currentTotal = yearTotals.get(year) ?? 0

      if (i === 0) {
        // First year - show total as baseline
        map.set(year, 0)
      } else {
        const prevYear = fullYears[i - 1]
        const prevTotal = yearTotals.get(prevYear) ?? 0

        if (prevTotal > 0) {
          // Calculate percentage growth
          const growth = ((currentTotal - prevTotal) / prevTotal) * 100
          map.set(year, growth)
        } else if (currentTotal > 0) {
          map.set(year, 100) // 100% if starting from zero
        } else {
          map.set(year, 0)
        }
      }
    }
    return map
  })()

  // Calculate softmax for year totals (for border colors) using log-scaled values
  $: yearTotalSoftmax = (() => {
    const yearTotalsArray = fullYears.map((year) => {
      const total = yearTotals.get(year) ?? 0
      return total > 0 ? Math.log1p(total) : 0
    })
    const softmaxValues = softmax(yearTotalsArray, 0.8)
    const map = new Map<number, number>()
    fullYears.forEach((year, i) => {
      map.set(year, softmaxValues[i])
    })
    return map
  })()

  // Softmax function for better differentiation
  function softmax (values: number[], temperature: number = 1.0): number[] {
    if (values.length === 0) return []

    // Handle case where all values are 0
    if (values.every((v) => v === 0)) return values.map(() => 1.0 / values.length)

    // Apply temperature scaling and find max for numerical stability
    const scaled = values.map((v) => v / temperature)
    const maxVal = Math.max(...scaled)

    // Compute exp(x - max) for numerical stability
    const exps = scaled.map((v) => Math.exp(v - maxVal))
    const sumExps = exps.reduce((a, b) => a + b, 0)

    // Normalize to get softmax probabilities
    return exps.map((e) => e / sumExps)
  }

  // Color scale: 0 = #ebedf0 (light gray), low = light green, high = dark green
  const COLORS = [
    '#ebedf0',
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

  function getColor (year: number, monthDate: number, hasData: boolean): string {
    if (!hasData) return COLORS[0]

    const yearMap = yearSoftmaxMaps.get(year)
    if (yearMap === undefined) return COLORS[0]

    const softmaxVal = yearMap.get(monthDate) ?? 0
    if (softmaxVal <= 0) return COLORS[0]

    // Map softmax value to color index within the year
    const maxSoftmax = Math.max(...Array.from(yearMap.values()))
    const normalizedVal = maxSoftmax > 0 ? softmaxVal / maxSoftmax : 0

    // Apply power transformation for better visual differentiation
    const scaledVal = Math.pow(normalizedVal, 0.6)
    const idx = Math.max(1, Math.min(COLORS.length - 1, Math.floor(scaledVal * (COLORS.length - 1)) + 1))

    return COLORS[idx]
  }

  function getBorderColor (year: number): string {
    const softmaxVal = yearTotalSoftmax.get(year) ?? 0
    const maxSoftmax = Math.max(...Array.from(yearTotalSoftmax.values()))
    const normalizedVal = maxSoftmax > 0 ? softmaxVal / maxSoftmax : 0

    // Scale from light gray to dark border
    const intensity = Math.floor(normalizedVal * 255)
    const color = 255 - intensity
    return `rgb(${color}, ${color}, ${color})`
  }

  import ratingPlugin from '@hcengineering/rating'
  import { tooltip } from '@hcengineering/ui'

  // Formatter for localized month names (short form, e.g. 'Jan', 'Feb' or localized equivalent)
  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })
</script>

{#if rating}
  <div class="rating-container">
    <!-- Monthly grid -->
    {#each Array.from({ length: ymax - ymin + 1 }, (_, i) => i + ymin) as year}
      {@const ymonths = months.filter((it) => Math.floor(it[0] / 100) === year)}
      {@const growth = yearGrowth.get(year) ?? 0}
      {@const growthText = growth === 0 ? '' : growth > 0 ? `+${growth.toFixed(0)}%` : `${growth.toFixed(0)}%`}
      <div class="year-section" style="border: 1px dashed {getBorderColor(year)};">
        <div class="year-header">
          <span class="year-label">{year}</span>
          <!-- {#if growthText}
            <span class="year-total" class:positive={growth > 0} class:negative={growth < 0}>{growthText}</span>
          {/if} -->
        </div>
        <div class="month-grid">
          {#each Array.from({ length: 12 }, (_, i) => i) as m, i}
            {@const monthval = year * 100 + m + 1}
            {@const yval = ymonths.find((it) => it[0] === monthval)}
            {#if yval}
              {@const ops = (yval[1] ?? 0) + (yval[2] ?? 0) + (yval[3] ?? 0)}
              {@const monthLabel = monthFormatter.format(new Date(year, i, 1))}
              <div
                class="month-cell"
                use:tooltip={{ label: ratingPlugin.string.MonthOps, props: { month: monthLabel, ops: String(ops) } }}
                style="background: {getColor(year, monthval, true)}"
              ></div>
            {:else}
              {@const monthLabel = monthFormatter.format(new Date(year, i, 1))}
              <div
                class="month-cell"
                use:tooltip={{ label: ratingPlugin.string.MonthNoOps, props: { month: monthLabel } }}
                style="background: {getColor(year, monthval, false)}"
              ></div>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .rating-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    max-width: 100%;
  }

  .year-section {
    display: flex;
    flex-direction: column;
    padding: 6px;
    border-radius: 4px;
    min-width: 0;
  }

  .year-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-bottom: 4px;
    white-space: nowrap;
  }

  .year-label {
    font-weight: 500;
    font-size: 14px;
  }

  .year-total {
    font-size: 11px;
    opacity: 0.6;
  }

  .year-total.positive {
    color: #28a745;
    opacity: 0.8;
  }

  .year-total.negative {
    color: #dc3545;
    opacity: 0.8;
  }

  .month-grid {
    display: grid;
    grid-template-columns: repeat(4, 12px);
    grid-template-rows: repeat(3, 12px);
    gap: 2px;
  }

  .month-cell {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    border: 1px solid #e0e0e0;
    transition: background 0.2s;
  }
</style>
