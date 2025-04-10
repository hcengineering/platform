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
  import { State } from '@hcengineering/process'
  import plugin from '../plugin'
  import { ButtonIcon, eventToHTMLElement, SelectPopup, SelectPopupValueType, showPopup } from '@hcengineering/ui'
  import { getToDoEndAction } from '../utils'
  import { getClient } from '@hcengineering/presentation'

  export let state: State

  const client = getClient()

  $: icon = state.endAction?.methodId === plugin.method.CreateToDo ? plugin.icon.ToDo : plugin.icon.WaitSubprocesses

  function clickHandler (e: MouseEvent): void {
    const value: SelectPopupValueType[] = [
      {
        id: plugin.method.CreateToDo,
        label: plugin.string.OnToDoClose,
        icon: plugin.icon.ToDo
      },
      {
        id: plugin.method.WaitSubProcess,
        label: plugin.string.OnSubProcessesDone,
        icon: plugin.icon.WaitSubprocesses
      }
    ]
    showPopup(
      SelectPopup,
      {
        value
      },
      eventToHTMLElement(e),
      async (res) => {
        if (res !== undefined) {
          if (res === plugin.method.WaitSubProcess) {
            await client.update(state, { endAction: { methodId: plugin.method.WaitSubProcess, params: {} } })
          } else {
            await client.update(state, { endAction: getToDoEndAction(state) })
          }
        }
      }
    )
  }
</script>

<ButtonIcon {icon} size={'medium'} on:click={clickHandler} />
