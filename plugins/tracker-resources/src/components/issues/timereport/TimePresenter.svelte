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
  import { getEmbeddedLabel, translate } from '@hcengineering/platform'
  import { themeStore, tooltip } from '@hcengineering/ui'
  import tracker from '../../../plugin'

  export let id: string | undefined = undefined
  export let kind: 'link' | undefined = undefined
  export let value: number
  export let accent: boolean = false

  // TODO: Make configurable?
  const hoursInWorkingDay = 8

  let label = ''

  $: days = Math.floor(value / hoursInWorkingDay)
  $: hours = Math.floor(value % hoursInWorkingDay)
  $: minutes = Math.round((value % 1) * 60)

  $: void getLabel(days, hours, minutes, $themeStore.language)

  async function getLabel (days: number, hours: number, minutes: number, language: string): Promise<void> {
    try {
      const res: string[] = []
      if (days > 0) {
        const d = await translate(tracker.string.TimeSpendDays, { value: days }, language)
        res.push(d)
      }
      if (hours > 0) {
        const h = await translate(tracker.string.TimeSpendHours, { value: hours }, language)
        res.push(h)
      }
      if (minutes > 0) {
        const m = await translate(tracker.string.TimeSpendMinutes, { value: minutes }, language)
        res.push(m)
      }
      if (res.length > 0) {
        label = res.join(' ')
      } else {
        label = await translate(tracker.string.TimeSpendHours, { value: 0 }, language)
      }
    } catch {}
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<span
  {id}
  class:link={kind === 'link'}
  class:fs-bold={accent}
  on:click
  use:tooltip={{ label: getEmbeddedLabel(label) }}
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
