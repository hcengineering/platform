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
  import core, { AnyAttribute, Association, generateId, Ref, Relation } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Process, Step } from '@hcengineering/process'
  import { Label, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getContext } from '../../utils'
  import ProcessAttribute from '../ProcessAttribute.svelte'
  import AssociationSelector from './AssociationSelector.svelte'

  export let process: Process
  export let step: Step<Relation>

  const dispatch = createEventDispatcher()

  const params = step.params
  let association = params.association as Ref<Association> | undefined
  let direction = params.direction as 'A' | 'B' | undefined
  const _id = params._id

  const client = getClient()

  $: assoc = association && client.getModel().findObject(association)
  $: targetClass = assoc && direction ? (direction === 'A' ? assoc.classA : assoc.classB) : undefined

  function changeAssociation (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      association = e.detail.association
      direction = e.detail.direction
      params.association = association
      params.direction = direction
      ;(step.params as any) = params
      dispatch('change', step)
    }
  }

  function changeParam (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      params._id = e.detail
      ;(step.params as any)._id = e.detail
      dispatch('change', step)
    }
  }

  let attribute: AnyAttribute
  $: attribute = {
    attributeOf: process.masterTag,
    name: '',
    type: {
      label: core.string.Ref,
      _class: core.class.RefTo,
      to: targetClass
    },
    _id: generateId(),
    space: core.space.Model,
    modifiedOn: 0,
    modifiedBy: core.account.System,
    _class: core.class.Attribute,
    label: core.string.Object
  }

  $: context = targetClass && getContext(client, process, targetClass, 'object')
</script>

<div class="grid">
  <span
    class="labelOnPanel"
    use:tooltip={{
      props: { label: core.string.Relation }
    }}
  >
    <Label label={core.string.Relation} />
  </span>
  <AssociationSelector {process} {association} {direction} on:change={changeAssociation} />
  {#if targetClass && context && attribute}
    <ProcessAttribute
      value={_id}
      {process}
      {attribute}
      {context}
      masterTag={process.masterTag}
      editor={undefined}
      presenterClass={{
        attrClass: targetClass,
        category: 'object'
      }}
      forbidValue
      on:change={changeParam}
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
  }
</style>
