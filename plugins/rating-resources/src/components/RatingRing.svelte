<!-- Circular Level Display with Progress -->
<script lang="ts">
  import { translateCB } from '@hcengineering/platform'
  import ratingPlugin, { getLevelInfo } from '@hcengineering/rating'

  export let rating: number = 0
  export let showValues = false

  $: levelInfo = getLevelInfo(rating)

  let levelLabel: string | undefined = undefined
  $: translateCB(ratingPlugin.string.Level, {}, undefined, (r) => (levelLabel = r))
</script>

{#if rating > 0}
  <div class="flex-row-center">
    {#if levelLabel}{levelLabel}{/if}
    <div class="level-circle">
      <svg class="progress-ring" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <!-- Background circle -->
        <circle cx="60" cy="60" r="50" class="progress-ring-bg" />
        <!-- Progress circle (bold overlay) -->
        <circle
          cx="60"
          cy="60"
          r="50"
          class="progress-ring-fill"
          style="stroke-dashoffset: {314.16 * (1 - levelInfo.progress / 100)}px"
        />
      </svg>
      <div class="level-content">
        <span class="level-number">{levelInfo.level}</span>
      </div>
    </div>
    {#if showValues}
      <span class="text-sm caption-color">({Math.round(rating * 100)}/{Math.round(levelInfo.nextThreshold * 100)})</span
      >
    {/if}
  </div>
{/if}

<style lang="scss">
  .level-circle {
    position: relative;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .progress-ring {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .progress-ring-bg {
    fill: none;
    stroke: var(--global-secondary-TextColor);
    stroke-width: 1.5;
    opacity: 0.15;
  }

  .progress-ring-fill {
    fill: none;
    stroke: #ffc107;
    stroke-width: 3.5;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
    stroke-dasharray: 314.16;

    &:hover {
      filter: drop-shadow(0 0 0.2rem rgba(255, 193, 7, 0.7));
    }
  }

  .level-content {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
  }

  .level-number {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--global-primary-TextColor);
    line-height: 1;
  }
</style>
