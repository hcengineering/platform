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
  import core, { Ref, type AnyAttribute, type Class, type Type } from '@hcengineering/core'
  import card from '@hcengineering/card'
  import { getAttributeEditor, getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import { type Process, type Step } from '@hcengineering/process'
  import { AnySvelteComponent, DropdownLabelsIntl, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getContext } from '../../utils'
  import setting from '@hcengineering/setting-resources/src/plugin'
  import plugin from '../../plugin'
  import ProcessAttribute from '../ProcessAttribute.svelte'
  import view from '@hcengineering/view'

  export let process: Process
  export let step: Step<any>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  function getTypes (): any[] {
    const descendants = hierarchy.getDescendants(core.class.Type)
    const res: any[] = []
    for (const descendant of descendants) {
      const _class = hierarchy.getClass(descendant)
      if (_class.label !== undefined && hierarchy.hasMixin(_class, view.mixin.ObjectEditor)) {
        res.push({
          label: _class.label,
          id: _class._id
        })
      }
    }
    return res
  }

  const items = getTypes()

  $: typeId = step.params.typeId

  $: attribute = getAttribute(typeId)
  function getAttribute (typeId: Ref<Class<Type<AnyAttribute>>> | undefined): AnyAttribute | undefined {
    if (typeId === undefined) {
      return undefined
    }
    const res: AnyAttribute = {
      _id: '' as any,
      _class: core.class.Attribute,
      name: 'value',
      label: setting.string.Value,
      type: { _class: typeId, label: setting.string.Value },
      attributeOf: card.class.Card,
      space: core.space.Model,
      modifiedOn: 0,
      modifiedBy: core.account.System
    }
    return res
  }

  $: presenterClass = attribute && getAttributePresenterClass(hierarchy, attribute.type)
  $: context = presenterClass && typeId && getContext(client, process, typeId, presenterClass.category)

  function onTypeSelected (e: CustomEvent<any>): void {
    step.params.typeId = e.detail
    if (step.context != null) {
      step.context._class = e.detail
    }
    step.params.value = null
    dispatch('change', step)
  }

  function onChange (e: CustomEvent<any>): void {
    step.params.value = e.detail
    dispatch('change', step)
  }

  let editor: AnySvelteComponent | undefined

  function getBaseEditor (attribute: AnyAttribute): void {
    void getAttributeEditor(client, plugin.class.ApproveRequest, {
      attr: attribute,
      key: 'user'
    }).then((p) => {
      editor = p
    })
  }

  $: attribute && getBaseEditor(attribute)
</script>

<div class="grid">
  <span class="label">
    <Label label={setting.string.Type} />
  </span>
  <DropdownLabelsIntl
    {items}
    selected={typeId}
    shouldUpdateUndefined={false}
    size={'large'}
    width={'100%'}
    on:selected={onTypeSelected}
  />
  {#if typeId && attribute && presenterClass}
    <ProcessAttribute
      {process}
      {context}
      {attribute}
      {presenterClass}
      value={step.params.value}
      editor={undefined}
      masterTag={process.masterTag}
      forbidValue
      on:change={onChange}
    />
  {/if}
</div>

<style lang="scss">
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

    .label {
      font-weight: 500;
      color: var(--theme-caption-color);
      user-select: none;
    }
  }
</style>
