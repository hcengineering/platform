<script lang="ts">
  import { Label, tooltip } from '@hcengineering/ui'
  import tracker from '../../plugin'

  export let id: string | undefined = undefined
  export let kind: 'link' | undefined = undefined
  export let value: number
  export let accent: boolean = false
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<span
  {id}
  class:link={kind === 'link'}
  class:fs-bold={accent}
  on:click
  use:tooltip={{
    component: Label,
    props: {
      label: tracker.string.Breakpoint,
      params: { value }
    }
  }}
>
  {`${value}/5` || 0}
</span>

<style lang="scss">
  .link {
    white-space: nowrap;

    font-size: 0.8125rem;
    color: var(--theme-content-color);
    cursor: pointer;

    &:hover {
      color: var(--theme-caption-color);
      text-decoration: underline;
    }
    &:active {
      color: var(--theme-accent-color);
    }
  }
</style>
