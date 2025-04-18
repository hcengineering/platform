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
  import core from '@hcengineering/core'
  import { Process, State } from '@hcengineering/process'
  import { settingsStore } from '@hcengineering/setting-resources'
  import { ButtonIcon, eventToHTMLElement, SelectPopup, SelectPopupValueType, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import ResultConfigure from './contextEditors/ResultConfigure.svelte'
  import plugin from '../plugin'
  import { translate } from '@hcengineering/platform'
  import Aside from './Aside.svelte'
  import { getToDoEndAction } from '../utils'
  import { getClient } from '@hcengineering/presentation'

  export let state: State
  export let process: Process

  function clickHandler (e: MouseEvent): void {
    const value: SelectPopupValueType[] = [
      {
        id: 'configure',
        label: plugin.string.RequestResult
      },
      {
        id: 'add',
        label: plugin.string.NewState
      }
    ]
    showPopup(SelectPopup, { value }, eventToHTMLElement(e), (res) => {
      if (res !== undefined) {
        if (res === 'configure') {
          resultConfigure()
        } else {
          void addState()
        }
      }
    })
  }

  function resultConfigure (): void {
    $settingsStore = { id: state._id + '_result', component: ResultConfigure, props: { state } }
  }

  async function addState (): Promise<void> {
    if (process === undefined) return
    const client = getClient()

    const id = await client.createDoc(plugin.class.State, core.space.Model, {
      actions: [],
      process: process._id,
      title: await translate(plugin.string.NewState, {})
    })

    await client.update(process, { states: [...process.states, id] })

    if (state !== undefined) {
      const endAction = getToDoEndAction(state)
      state.endAction = endAction
      await client.update(state, { endAction })
      $settingsStore = { id: process._id, component: Aside, props: { process, value: state, index: -1 } }
    }
  }

  $: icon = state.resultType?.icon ?? view.icon.Add
</script>

<ButtonIcon {icon} size={'medium'} on:click={clickHandler} />
