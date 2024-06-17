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
  import { Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { Project } from '@hcengineering/task'
  import { Label, ModeSelector, Separator, defineSeparators, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import time from '../../plugin'
  import { teamSeparators } from '../../utils'
  import TeamNavigator from './TeamNavigator.svelte'
  import Agenda from './agenda/Agenda.svelte'
  import Calendar from './calendar/Calendar.svelte'

  let currentDate: Date = new Date()

  let space: Ref<Project> | undefined = undefined

  function changeMode (_mode: string): void {
    mode = _mode
  }

  const config: Array<[string, IntlString, object]> = [
    ['agenda', time.string.Agenda, {}],
    ['calendar', time.string.Calendar, {}]
  ]

  let mode = config[0][0]

  defineSeparators('team', teamSeparators)
</script>

<div class="background-comp-header-color w-full h-full flex-row-top">
  {#if $deviceInfo.navigator.visible}
    <TeamNavigator bind:selected={space} />
    <Separator
      name={'team'}
      float={$deviceInfo.navigator.float}
      index={0}
      disabledWhen={['panel-aside']}
      color={'var(--theme-navpanel-border)'}
    />
  {/if}
  <div class="background-comp-header-color flex-col w-full h-full">
    <div class="ac-header full divide caption-height header-with-mode-selector">
      <div class="ac-header__wrap-title">
        <span class="ac-header__title flex-row-center mr-2">
          <Label label={time.string.Team} />
        </span>
        <ModeSelector
          props={{
            mode,
            config,
            onChange: changeMode
          }}
        />
      </div>
    </div>
    {#if space}
      {#if mode === 'calendar'}
        <Calendar {space} bind:currentDate />
      {:else}
        <Agenda {space} bind:currentDate />
      {/if}
    {/if}
  </div>
</div>
