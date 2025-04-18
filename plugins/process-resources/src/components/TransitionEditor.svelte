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
  import { Process, State } from '@hcengineering/process'
  import { ButtonIcon, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import plugin from '../plugin'
  import TransitionPopup from './TransitionPopup.svelte'
  import { settingsStore } from '@hcengineering/setting-resources'
  import ResultConfigure from './contextEditors/ResultConfigure.svelte'

  export let state: State
  export let process: Process

  $: icon = state.endAction?.methodId === plugin.method.CreateToDo ? plugin.icon.ToDo : plugin.icon.WaitSubprocesses

  function clickHandler (e: MouseEvent): void {
    showPopup(TransitionPopup, { state, process }, eventToHTMLElement(e))
  }

  function resultClick (e: MouseEvent): void {
    $settingsStore = { id: state._id + '_result', component: ResultConfigure, props: { state } }
  }

  $: resultIcon = state.resultType?.icon ?? undefined
</script>

<ButtonIcon {icon} size={'medium'} on:click={clickHandler} />
{#if resultIcon}
  <ButtonIcon icon={resultIcon} size={'medium'} on:click={resultClick} />
{/if}
