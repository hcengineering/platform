<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import DPCalendar from './icons/DPCalendar.svelte'
  import DPCalendarOver from './icons/DPCalendarOver.svelte'
  import ui from '../../plugin'
  import Icon from '../Icon.svelte'
  import Label from '../Label.svelte'

  export let formattedDate: string = ''
  export let daysDifference: number = 0
  export let isOverdue: boolean = false
  export let iconModifier: 'warning' | 'critical' | 'overdue' | undefined = undefined
  export let shouldIgnoreOverdue: boolean = false
</script>

{#if formattedDate}
  <div class="root">
    <div
      class="iconContainer"
      class:mIconContainerWarning={iconModifier === 'warning'}
      class:mIconContainerCritical={iconModifier === 'critical' || iconModifier === 'overdue'}
    >
      <Icon icon={isOverdue && !shouldIgnoreOverdue ? DPCalendarOver : DPCalendar} size={'small'} />
    </div>
    <div class="messageContainer">
      <div class="title">
        <Label
          label={isOverdue ? ui.string.DueDatePopupOverdueTitle : ui.string.DueDatePopupTitle}
          params={{ value: formattedDate }}
        />
      </div>
      <div class="description">
        {#if !shouldIgnoreOverdue}
          <Label
            label={isOverdue ? ui.string.DueDatePopupOverdueDescription : ui.string.DueDatePopupDescription}
            params={{ value: daysDifference }}
          />
        {/if}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .root {
    display: flex;
    width: 10rem;
  }

  .iconContainer {
    color: var(--content-color);
    margin-right: 1rem;

    &.mIconContainerWarning {
      color: var(--theme-warning-color);
    }

    &.mIconContainerCritical {
      color: var(--theme-error-color);
    }
  }

  .messageContainer {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .title {
    color: var(--caption-color);
    font-weight: 500;
  }

  .description {
    margin-top: 0.25rem;
    color: var(--dark-color);
  }
</style>
