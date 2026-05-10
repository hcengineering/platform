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
  import cardPlugin, { Card, MasterTag } from '@hcengineering/card'
  import { TypeSelector } from '@hcengineering/card-resources'
  import core, { AnyAttribute, Class, Ref } from '@hcengineering/core'
  import { translateCB } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { createContext, Process, Step } from '@hcengineering/process'
  import { Button, eventToHTMLElement, Label, SelectPopup, showPopup, Toggle, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import ParamsEditor from './ParamsEditor.svelte'
  import plugin from '../../plugin'
  import { generateContextId } from '../../utils'

  export let process: Process
  export let step: Step<Card>

  const dispatch = createEventDispatcher()

  step.params.title = step.params.title ?? ''
  step.params.targetClass = step.params.targetClass ?? step.params._class ?? process.masterTag
  step.params._class = step.params._class ?? process.masterTag

  let params = step.params

  let targetClass: Ref<Class<MasterTag>> =
    (params.targetClass as Ref<Class<MasterTag>>) ?? (params._class as Ref<Class<MasterTag>>) ?? process.masterTag

  const client = getClient()
  const h = client.getHierarchy()

  translateCB(cardPlugin.string.Card, {}, undefined, (res) => {
    setName(res)
  })

  function setName (name: string): void {
    if (params.title === undefined || params.title === '') {
      params.title = name
      ;(step.params as any) = params
      dispatch('change', step)
    }
  }

  function change (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      params = e.detail
      ;(step.params as any) = e.detail
      dispatch('change', step)
    }
  }

  function getKeys (_class: Ref<Class<MasterTag>>): AnyAttribute[] {
    const ignoreKeys = ['_class', 'targetClass', 'parent', 'attachments', 'todos']
    const attributes = h.getAllAttributes(_class, core.class.Doc)
    const res: AnyAttribute[] = []
    for (const [key, attr] of attributes) {
      if (attr.hidden === true) continue
      if (ignoreKeys.includes(key)) continue
      res.push(attr)
    }
    return res
  }

  let keys = Object.keys(params).filter((key) => {
    return key !== '_class' && key !== 'targetClass'
  })

  $: allAttrs = getKeys(targetClass)
  $: possibleAttrs = allAttrs.filter((attr) => !keys.includes(attr.name))

  function addKey (key: string): void {
    keys = [...keys, key]
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

  function remove (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      const key = e.detail.key
      if (key === 'title') return
      keys = keys.filter((k) => k !== key)
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (params as any)[key]
      ;(step.params as any) = params
      dispatch('change', step)
    }
  }

  function typeChange (_id: Ref<Class<MasterTag>>): void {
    if (_id === undefined) return
    const attrKeys = ['_class', 'targetClass', ...getKeys(_id).map((p) => p.name)]
    const oldParams = { ...params }
    params = {}
    for (const key of attrKeys) {
      if (oldParams[key] !== undefined) {
        ;(params as any)[key] = oldParams[key]
      }
    }
    keys = Object.keys(params).filter((key) => {
      return key !== '_class' && key !== 'targetClass'
    })
    if (params.targetClass !== _id) {
      params._class = _id
      params.targetClass = _id
    }
    step.params = params
    if (step.context != null) {
      step.context._class = _id
    }
    step = step
    dispatch('change', step)
  }

  $: typeChange(targetClass)

  $: subclasses = h.getDescendants(targetClass).filter((c) => !h.isMixin(c) && c !== targetClass)

  let askSubclass = params._class !== params.targetClass
  $: askSubclass = params._class !== params.targetClass

  function changeAskSubclass (e: CustomEvent<boolean>): void {
    const context = createContext({
      type: 'userRequest',
      id: generateContextId(),
      _class: targetClass,
      key: '_class'
    })
    if (e.detail !== undefined) {
      step.params._class = e.detail ? context : targetClass
      dispatch('change', step)
    }
  }
</script>

<div class="grid">
  <span
    class="labelOnPanel"
    use:tooltip={{
      props: { label: cardPlugin.string.MasterTag }
    }}
  >
    <Label label={cardPlugin.string.MasterTag} />
  </span>
  <TypeSelector
    value={targetClass}
    width={'100%'}
    on:change={(e) => {
      if (e.detail !== undefined) {
        targetClass = e.detail
      }
    }}
  />
  {#if subclasses.length > 0}
    <span
      class="labelOnPanel"
      use:tooltip={{
        props: { label: plugin.string.AskSubclass }
      }}
    >
      <Label label={plugin.string.AskSubclass} />
    </span>
    <div>
      <Toggle on={askSubclass} on:change={changeAskSubclass} />
    </div>
  {/if}
</div>
<div class="divider" />
{#key targetClass}
  <ParamsEditor _class={targetClass} {process} {keys} {params} allowRemove on:remove={remove} on:change={change} />
{/key}
{#if possibleAttrs.length > 0}
  <div class="flex-center mt-4">
    <Button label={presentation.string.Add} width={'100%'} kind={'link-bordered'} size={'large'} on:click={onAdd} />
  </div>
{/if}

<style lang="scss">
  .divider {
    border-bottom: 1px solid var(--divider-color);
    margin: 1rem 0;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
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
