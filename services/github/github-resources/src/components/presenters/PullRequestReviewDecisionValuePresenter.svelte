<script lang="ts">
  import { Asset, IntlString } from '@hcengineering/platform'
  import { AnySvelteComponent, Icon, Label, PaletteColorIndexes, getPlatformColor, themeStore } from '@hcengineering/ui'
  import { GithubReviewDecisionState } from '@hcengineering/github'
  import { ComponentType } from 'svelte'
  import github from '../../plugin'

  export let value: GithubReviewDecisionState
  export let small = false

  const labels: Record<
  GithubReviewDecisionState,
  { label: IntlString, color: number, icon: Asset | AnySvelteComponent | ComponentType }
  > = {
    [GithubReviewDecisionState.Approved]: {
      icon: github.icon.PullRequest,
      label: github.string.ReviewApproved,
      color: PaletteColorIndexes.Grass
    },
    [GithubReviewDecisionState.ChangesRequested]: {
      icon: github.icon.PullRequest,
      label: github.string.ReviewChangesRequested,
      color: PaletteColorIndexes.Firework
    },
    [GithubReviewDecisionState.ReviewRequired]: {
      icon: github.icon.PullRequest,
      label: github.string.ReviewPending,
      color: PaletteColorIndexes.Blueberry
    }
  }

  $: label = labels[value]
</script>

<div
  class={!small ? 'p-1 border-radius-1' : ''}
  style:background-color={!small ? getPlatformColor(label.color, $themeStore.dark) : undefined}
  style:color={'white'}
>
  <div class="flex-row-center no-word-wrap">
    <Icon
      icon={label.icon}
      size={'small'}
      fill={small ? getPlatformColor(label.color, $themeStore.dark) : 'currentColor'}
    />
    {#if !small}
      <div class="ml-1">
        <Label label={label.label} />
      </div>
    {/if}
  </div>
</div>
