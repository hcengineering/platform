<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
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
