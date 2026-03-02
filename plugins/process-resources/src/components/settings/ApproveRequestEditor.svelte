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
  import contact from '@hcengineering/contact'
  import core, { AnyAttribute } from '@hcengineering/core'
  import { getAttributeEditor, getAttributePresenterClass, getClient } from '@hcengineering/presentation'
  import { ApproveRequest, parseContext, Process, Step } from '@hcengineering/process'
  import { AnySvelteComponent, Label, Toggle } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import { getContext, getMockAttribute } from '../../utils'
  import ProcessAttribute from '../ProcessAttribute.svelte'
  import ParamsEditor from './ParamsEditor.svelte'

  export let process: Process
  export let step: Step<ApproveRequest>

  let params = step.params

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  function changeParams (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      params = e.detail
      ;(step.params as any) = params
      dispatch('change', step)
    }
  }

  const keys = ['dueDate']

  $: value = params.user

  const type = {
    label: core.string.Array,
    _class: core.class.ArrOf,
    of: {
      label: core.string.Ref,
      _class: core.class.RefTo,
      to: contact.mixin.Employee
    }
  }

  const attribute = getMockAttribute(plugin.class.ApproveRequest, plugin.string.Approvers, type)

  const presenterClass = getAttributePresenterClass(hierarchy, attribute.type)
  $: context = getContext(client, process, presenterClass.attrClass, presenterClass.category)

  function onChange (e: CustomEvent<any>): void {
    params.user = e.detail
    ;(step.params as any) = params
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

  getBaseEditor(attribute)

  $: contextValue = typeof params.user === 'string' ? parseContext(params.user) : undefined
  $: userContext = contextValue?.type === 'attribute'

  $: if (!userContext && params.field) {
    delete (params as any).field
    step.params = params
    dispatch('change', step)
  }

  function toggleField (e: CustomEvent<boolean>): void {
    if (e.detail) {
      if (contextValue?.type === 'attribute') {
        params.field = contextValue.key
      }
    } else {
      delete (params as any).field
    }
    step.params = params
    dispatch('change', step)
  }

  function toggleActionType (e: CustomEvent<any>): void {
    params.actionType = e.detail ? 'review' : 'approve'
    step.params = params
    dispatch('change', step)
  }
</script>

<div class="grid">
  <ProcessAttribute
    {process}
    {context}
    {editor}
    {attribute}
    {presenterClass}
    {value}
    masterTag={process.masterTag}
    allowArray={true}
    on:remove
    on:change={onChange}
  />
  <div>
    <Label label={plugin.string.SyncWithField} />
  </div>
  <Toggle disabled={!userContext} on={params.field !== undefined} on:change={toggleField} />
  <div>
    <Label label={plugin.string.ReviewAction} />
  </div>
  <Toggle on={params.actionType === 'review'} on:change={toggleActionType} />
</div>
<ParamsEditor _class={plugin.class.ApproveRequest} {process} {keys} {params} on:change={changeParams} />

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 1rem;
    margin: 0.25rem 2rem 0.5rem;
    width: calc(100% - 4rem);
    height: min-content;
  }
</style>
