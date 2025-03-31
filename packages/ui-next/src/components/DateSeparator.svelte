<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { themeStore } from '@hcengineering/theme'
  import { translate } from '@hcengineering/platform'
  import { Timestamp } from '@hcengineering/core'

  import ui from '../plugin'

  export let date: Timestamp
  export let sticky: boolean = true

  async function formatDate (timestamp: Timestamp, lang: string): Promise<string> {
    const now = new Date()
    const date = new Date(timestamp)

    const today = new Date(now).setHours(0, 0, 0, 0)
    const yesterday = new Date(today).setDate(now.getDate() - 1)

    if (date.getTime() === today) {
      return await translate(ui.string.Today, {}, lang)
    } else if (date.getTime() === yesterday) {
      return await translate(ui.string.Yesterday, {}, lang)
    } else {
      const dayOfWeek = new Intl.DateTimeFormat('default', { weekday: 'long' }).format(date)
      const day = new Intl.DateTimeFormat('default', { day: '2-digit' }).format(date)
      const month = new Intl.DateTimeFormat('default', { month: 'long' }).format(date)
      return `${dayOfWeek} ${day} ${month}`
    }
  }
</script>

<div class="date-separator" class:sticky>
  <div class="date-separator__date">
    {#await formatDate(date, $themeStore.language) then date}
      {date}
    {/await}
  </div>
</div>

<style lang="scss">
  .date-separator {
    display: flex;
    width: 100%;
    padding: 0.375rem 0;
    align-items: center;
    gap: 0.375rem;
    border-bottom: 1px solid var(--next-divider-color);
    background: var(--next-panel-color-background);

    &.sticky {
      position: sticky;
      top: 0;
      z-index: 1;
    }
  }

  .date-separator__date {
    color: var(--next-text-color-secondary);
    font-size: 0.813rem;
    font-weight: 500;
    padding: 0 1rem;
  }
</style>
