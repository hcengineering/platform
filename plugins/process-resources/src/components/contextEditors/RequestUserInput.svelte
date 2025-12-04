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
  import core, { AnyAttribute, Class, Doc, generateId, Ref, RefTo } from '@hcengineering/core'
  import presentation, { Card, findAttributeEditor, getClient } from '@hcengineering/presentation'
  import { Process, Transition } from '@hcengineering/process'
  import { AnyComponent, Component, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import TransitionPresenter from '../settings/TransitionPresenter.svelte'

  export let processId: Ref<Process>
  export let transition: Ref<Transition>
  export let key: string
  export let _class: Ref<Class<Doc>>

  let value: any | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const model = client.getModel()
  const attribute = hierarchy.findAttribute(_class, key) ?? (key === '' ? mockAttribute(_class) : undefined)

  function mockAttribute (_class: Ref<Class<Doc>>): AnyAttribute {
    const type: RefTo<Doc> = {
      label: core.string.Ref,
      _class: core.class.RefTo,
      to: _class
    }
    return {
      attributeOf: _class,
      name: '',
      type,
      _id: generateId(),
      space: core.space.Model,
      modifiedOn: 0,
      modifiedBy: core.account.System,
      _class: core.class.Attribute,
      label: core.string.Object
    }
  }

  function save (): void {
    dispatch('close', { value })
  }

  let editor: AnyComponent | undefined

  function getEditor (_class: Ref<Class<Doc>>, key: string): void {
    if (key === '' || key === '_id') {
      const mixin = hierarchy.classHierarchyMixin(_class, view.mixin.AttributeEditor)
      if (mixin?.inlineEditor !== undefined) {
        editor = mixin.inlineEditor
        return
      }
    }
    editor = findAttributeEditor(client, _class, key)
  }

  function onChange (val: any | undefined): void {
    value = val
  }

  export function canClose (): boolean {
    return false
  }

  const transitionVal = model.findObject(transition)
  const processVal = model.findObject(processId)

  $: getEditor(_class, key)
</script>

<Card
  on:close
  width={'menu'}
  label={plugin.string.EnterValue}
  canSave
  okAction={save}
  okLabel={presentation.string.Save}
>
  {#if processVal !== undefined}
    <div>
      <Label label={plugin.string.Process} />:
      {processVal.name}
    </div>
  {/if}
  {#if transitionVal}
    <TransitionPresenter transition={transitionVal} />
  {/if}
  {#if attribute}
    <Label label={attribute.label} />:
  {/if}
  {#if editor}
    <div class="w-full mt-2">
      <Component
        is={editor}
        props={{
          label: attribute?.label,
          placeholder: attribute?.label,
          kind: 'ghost',
          size: 'large',
          width: '100%',
          justify: 'left',
          type: attribute?.type,
          showNavigate: false,
          value,
          onChange,
          focus
        }}
      />
    </div>
  {/if}
</Card>
