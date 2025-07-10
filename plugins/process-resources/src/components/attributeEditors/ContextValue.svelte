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
  import { SelectedContext, Context, Process } from '@hcengineering/process'
  import { eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import ConfigurePopup from './ConfigurePopup.svelte'
  import { Ref, Class, Doc, AnyAttribute } from '@hcengineering/core'
  import ContextValuePresenter from './ContextValuePresenter.svelte'
  import { AttributeCategory } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { MasterTag, Tag } from '@hcengineering/card'

  export let process: Process
  export let masterTag: Ref<MasterTag | Tag>
  export let contextValue: SelectedContext
  export let context: Context
  export let attribute: AnyAttribute
  export let attrClass: Ref<Class<Doc>>
  export let category: AttributeCategory
  export let allowArray: boolean = false

  const dispatch = createEventDispatcher()

  $: configurable = contextValue.type !== 'userRequest'

  function configure (e: MouseEvent): void {
    if (!configurable) return
    const onChange = (res: any): void => {
      if (res !== undefined) {
        if (res.fallbackValue !== undefined) {
          contextValue.fallbackValue = res.fallbackValue
        }
        if (res.functions !== undefined) {
          contextValue.functions = res.functions
        }
        dispatch('update', res)
      }
    }
    showPopup(
      ConfigurePopup,
      { contextValue, attrClass, masterTag, category, attribute, context, onChange, allowArray },
      eventToHTMLElement(e)
    )
  }
</script>

{#if configurable}
  <button on:click={configure}>
    <ContextValuePresenter {contextValue} {context} {process} />
  </button>
{:else}
  <ContextValuePresenter {contextValue} {context} {process} />
{/if}
