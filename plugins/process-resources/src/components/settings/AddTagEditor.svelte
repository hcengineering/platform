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
  import cardPlugin, { Tag } from '@hcengineering/card'
  import { Process, Step } from '@hcengineering/process'
  import ParamsEditor from './ParamsEditor.svelte'
  import { Ref } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Button, eventToHTMLElement, Label, SelectPopup, showPopup, tooltip } from '@hcengineering/ui'
  import TagSelector from './TagSelector.svelte'
  import { createEventDispatcher } from 'svelte'

  export let process: Process
  export let step: Step<Tag>

  const params = step.params
  let _id = params._id as Ref<Tag>
  let props = params.props

  const client = getClient()
  const dispatch = createEventDispatcher()

  let keys = Object.keys(props || {})

  function changeTag (e: CustomEvent<{ tag: Ref<Tag> }>): void {
    if (e.detail !== undefined) {
      _id = e.detail.tag
      keys = []
      params._id = _id
      props = {}
      params.props = props
      step.params = params
      if (step.context != null) {
        step.context._class = _id
      }
      dispatch('change', step)
    }
  }

  function removeParam (e: CustomEvent<{ key: string }>): void {
    if (e.detail !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete props[e.detail.key]
      keys = keys.filter((p) => p !== e.detail.key)
      params.props = props
      step.params = params
      dispatch('change', step)
    }
  }

  $: allAttrs = _id !== undefined ? Array.from(client.getHierarchy().getOwnAttributes(_id).values()) : []
  $: possibleAttrs = allAttrs.filter((attr) => !keys.includes(attr.name))

  function onAdd (e: MouseEvent): void {
    showPopup(
      SelectPopup,
      {
        value: possibleAttrs.map((p) => {
          return { id: p.name, label: p.label }
        })
      },
      eventToHTMLElement(e),
      (res) => {
        if (res != null) {
          addKey(res)
        }
      }
    )
  }

  function addKey (key: string): void {
    keys = [...keys, key]
  }

  function change (e: CustomEvent<any>): void {
    if (e.detail == null) return
    props = e.detail
    params.props = props
    step.params = params
    dispatch('change', step)
  }
</script>

<div class="flex-col flex-gap-2">
  <div class="editor-grid">
    <span
      class="labelOnPanel"
      use:tooltip={{
        props: { label: cardPlugin.string.Tag }
      }}
    >
      <Label label={cardPlugin.string.Tag} />
    </span>
    <TagSelector {process} tag={_id} on:change={changeTag} />
  </div>
  <ParamsEditor
    {process}
    _class={_id}
    allowRemove
    bind:params={props}
    {keys}
    on:change={change}
    on:remove={removeParam}
  />
  {#if possibleAttrs.length > 0}
    <div class="flex-center mx-8">
      <Button label={presentation.string.Add} width={'100%'} kind={'link-bordered'} size={'large'} on:click={onAdd} />
    </div>
  {/if}
</div>
