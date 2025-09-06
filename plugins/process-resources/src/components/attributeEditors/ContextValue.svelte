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
  import { MasterTag, Tag } from '@hcengineering/card'
  import { AnyAttribute, Class, Doc, Ref } from '@hcengineering/core'
  import { Context, Process, SelectedContext } from '@hcengineering/process'
  import { Button, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { AttributeCategory } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import ConfigurePopup from './ConfigurePopup.svelte'
  import ContextValuePresenter from './ContextValuePresenter.svelte'

  export let process: Process
  export let masterTag: Ref<MasterTag | Tag>
  export let contextValue: SelectedContext
  export let context: Context
  export let attribute: AnyAttribute
  export let attrClass: Ref<Class<Doc>>
  export let category: AttributeCategory
  export let allowArray: boolean = false
  export let forbidValue: boolean = false

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
      { contextValue, attrClass, process, category, attribute, context, onChange, allowArray, forbidValue },
      eventToHTMLElement(e)
    )
  }
</script>

{#if configurable}
  <Button kind={'ghost'} on:click={configure} width={'100%'} shrink={1} justify={'left'} padding={'0.25rem'}>
    <svelte:fragment slot="content">
      <ContextValuePresenter {contextValue} {context} {process} />
    </svelte:fragment>
  </Button>
{:else}
  <div class="container">
    <ContextValuePresenter {contextValue} {context} {process} />
  </div>
{/if}

<style>
  .container {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.25rem;
  }
</style>
