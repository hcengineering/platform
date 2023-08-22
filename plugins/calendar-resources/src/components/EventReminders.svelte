<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Button, eventToHTMLElement, Icon, IconClose, Label, showPopup, TimeShiftPresenter } from '@hcengineering/ui'
  import calendar from '../plugin'
  import ReminderPopup from './ReminderPopup.svelte'

  export let reminders: number[]

  function addReminder () {
    reminders = [...reminders, 30 * 60 * 1000]
  }

  function edit (e: MouseEvent, value: number, index: number) {
    showPopup(ReminderPopup, { value }, eventToHTMLElement(e), (event) => {
      if (event) {
        reminders = [...reminders.slice(0, index), event, ...reminders.slice(index + 1)]
      }
    })
  }

  function remove (index: number) {
    reminders = [...reminders.slice(0, index), ...reminders.slice(index + 1)]
  }
</script>

<div class="flex-row-center flex-gap-2">
  <Icon icon={calendar.icon.Notifications} size="small" />
  <Button kind="ghost" on:click={addReminder}>
    <div slot="content">
      <Label label={reminders.length ? calendar.string.AddReminder : calendar.string.Reminders} />
    </div>
  </Button>
</div>
{#each reminders as reminder, i}
  <div class="ml-6 flex-row-center item">
    <Button kind="ghost" on:click={(e) => edit(e, reminder, i)}>
      <div slot="content"><TimeShiftPresenter value={reminder * -1} /></div>
    </Button>
    <div class="tool">
      <Button
        kind="ghost"
        icon={IconClose}
        iconProps={{ size: 'medium', fill: 'var(--theme-dark-color)' }}
        on:click={() => remove(i)}
      />
    </div>
  </div>
{/each}

<style lang="scss">
  .item {
    .tool {
      opacity: 0;
    }

    &:hover {
      .tool {
        opacity: 1;
      }
    }
  }
</style>
