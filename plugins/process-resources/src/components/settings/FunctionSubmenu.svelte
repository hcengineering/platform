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
  import { AnyAttribute, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Context, Func, Process, ProcessFunction } from '@hcengineering/process'
  import { ButtonIcon, eventToHTMLElement, IconSettings, Label, showPopup } from '@hcengineering/ui'
  import plugin from '../../plugin'

  export let attribute: AnyAttribute
  export let process: Process
  export let context: Context
  export let func: Func
  export let onChange: (func: Func) => void

  const client = getClient()

  function getFunction (_id: Ref<ProcessFunction>): ProcessFunction {
    return client.getModel().findAllSync(plugin.class.ProcessFunction, { _id })[0]
  }

  function onConfigure (e: MouseEvent): void {
    const f = getFunction(func.func)
    if (f.editor === undefined) return
    showPopup(
      f.editor,
      {
        func: f,
        masterTag: process.masterTag,
        process,
        context,
        attribute,
        props: func.props
      },
      eventToHTMLElement(e),
      (res) => {
        if (res != null) {
          func.props = res
          onChange(func)
        }
      }
    )
  }
</script>

<div class="flex-row-center flex-gap-2 pr-1 flex-shrink">
  <span class="overflow-label">
    <Label label={getFunction(func.func).label} />
  </span>
  {#if getFunction(func.func).editor}
    <ButtonIcon icon={IconSettings} size="small" kind="tertiary" on:click={onConfigure} />
  {/if}
</div>
