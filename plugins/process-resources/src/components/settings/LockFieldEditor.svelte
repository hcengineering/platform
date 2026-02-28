<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import cardPlugin, { Card, MasterTag, Tag } from '@hcengineering/card'
  import core, { AnyAttribute, Class, Ref } from '@hcengineering/core'
  import { Process, Step } from '@hcengineering/process'
  import { Button, eventToHTMLElement, IconClose, Label, SelectPopup, showPopup, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import TagSelector from './TagSelector.svelte'
  import presentation, { getClient } from '@hcengineering/presentation'

  export let process: Process
  export let step: Step<Card>

  const params = step.params

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const dispatch = createEventDispatcher()

  function getKeys (_class: Ref<Class<MasterTag>>): AnyAttribute[] {
    const ignoreKeys = ['_class', 'content', 'parent', 'attachments', 'todos']
    const attributes = hierarchy.getAllAttributes(_class, core.class.Doc)
    const res: AnyAttribute[] = []
    for (const [key, attr] of attributes) {
      if (attr.hidden === true) continue
      if (ignoreKeys.includes(key)) continue
      res.push(attr)
    }
    return res
  }

  function change (value: string[]): void {
    params.value = value
    step.params = params
    dispatch('change', step)
  }

  let keys: string[] = params.value ?? []

  $: allAttrs = getKeys(process.masterTag)
  $: possibleAttrs = allAttrs.filter((attr) => !keys.includes(attr.name))

  function addKey (key: string): void {
    keys = [...keys, key]
    change(keys)
  }

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

  function remove (key: string): void {
    keys = keys.filter((k) => k !== key)
    change(keys)
  }
</script>

<div class="grid">
  {#each keys as key (key)}
    {@const attribute = allAttrs.find((attr) => attr.name === key)}
    {#if attribute}
      <span
        class="labelOnPanel"
        use:tooltip={{
          props: { label: attribute.label }
        }}
      >
        <Label label={attribute.label} />
      </span>
      <div class="button flex-row-center">
        <Button icon={IconClose} kind="ghost" on:click={() => { remove(key) }} />
      </div>
    {/if}
  {/each}
</div>
{#if possibleAttrs.length > 0}
  <div class="flex-center mt-4">
    <Button label={presentation.string.Add} width={'100%'} kind={'link-bordered'} size={'large'} on:click={onAdd} />
  </div>
{/if}

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1.5fr 1.5fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 1rem;
    margin: 0.25rem 2rem 0;
    width: calc(100% - 4rem);
    height: min-content;
  }
</style>
