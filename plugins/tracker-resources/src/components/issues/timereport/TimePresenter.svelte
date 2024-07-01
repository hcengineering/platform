<script lang="ts">
  import { Label, tooltip, themeStore } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import { translate } from '@hcengineering/platform'

  export let id: string | undefined = undefined
  export let kind: 'link' | undefined = undefined
  export let value: number
  export let accent: boolean = false

  // TODO: Make configurable?
  const hoursInWorkingDay = 8

  let label = ''

  $: days = Math.floor(value / hoursInWorkingDay)
  $: hours = Math.floor(value % hoursInWorkingDay)
  $: minutes = Math.floor((value % 1) * 60)

  $: Promise.all([
    days > 0 ? translate(tracker.string.TimeSpendDays, { value: days }, $themeStore.language) : Promise.resolve(false),
    hours > 0
      ? translate(tracker.string.TimeSpendHours, { value: hours }, $themeStore.language)
      : Promise.resolve(false),
    minutes > 0
      ? translate(tracker.string.TimeSpendMinutes, { value: minutes }, $themeStore.language)
      : Promise.resolve(false)
  ])
    .then(([days, hours, minutes]) =>
      [
        ...(days === false ? [] : [days]),
        ...(hours === false ? [] : [hours]),
        ...(minutes === false ? [] : [minutes])
      ].join(' ')
    )
    .then((l) => (l === '' ? translate(tracker.string.TimeSpendHours, { value: 0 }, $themeStore.language) : l))
    .then((l) => {
      label = l
    })
    .catch((err) => {
      console.error(err)
    })
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
      label: tracker.string.TimeSpendHours,
      params: { value }
    }
  }}
>
  {label}
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
