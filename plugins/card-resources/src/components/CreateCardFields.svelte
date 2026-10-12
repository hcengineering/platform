<!--
// Copyright © 2026 TraceX SAS.
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
  import card from '@hcengineering/card'
  import type { Card, MasterTag } from '@hcengineering/card'
  import core, { toRank } from '@hcengineering/core'
  import type { Data, Ref } from '@hcengineering/core'
  import {
    findAttributeEditor,
    getAttribute,
    getClient,
    getFiltredKeys,
    isCollectionAttr
  } from '@hcengineering/presentation'
  import type { KeyedAttribute } from '@hcengineering/presentation'
  import { EmptyMarkup, isEmptyMarkup } from '@hcengineering/text'
  import { Component, Label } from '@hcengineering/ui'
  import { MarkupEditor } from '@hcengineering/view-resources'

  export let type: Ref<MasterTag>
  export let data: Partial<Data<Card>>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  let previousType: Ref<MasterTag> | undefined

  $: if (type !== previousType) {
    const attributes = hierarchy.getAllAttributes(type)
    data = Object.fromEntries(Object.entries(data).filter(([key]) => attributes.has(key)))
    previousType = type
  }

  function getFields (type: Ref<MasterTag>): KeyedAttribute[] {
    return getFiltredKeys(hierarchy, type, ['title', 'space', 'content', 'parent'], card.class.Card)
      .filter(
        (key) => !isCollectionAttr(hierarchy, key) && key.attr.showInCreate !== false && key.attr.readonly !== true
      )
      .sort((a, b) => {
        const rankA = a.attr.rank ?? toRank(a.attr._id) ?? ''
        const rankB = b.attr.rank ?? toRank(b.attr._id) ?? ''
        return rankA.localeCompare(rankB)
      })
  }

  $: fields = getFields(type)

  function getValue (key: KeyedAttribute, data: Partial<Data<Card>>): unknown {
    const value = getAttribute(client, data, key)
    return value === undefined ? structuredClone(key.attr.defaultValue) : value
  }

  function updateField (key: KeyedAttribute): (value: unknown) => void {
    return (value) => {
      data = { ...data, [key.key]: value }
    }
  }
</script>

{#key type}
  {#each fields as key (key.attr._id)}
    {@const editor = findAttributeEditor(client, type, key)}
    {@const readonly = key.attr.readonly === true || key.attr.automationOnly === true}
    {@const value = getValue(key, data)}
    {#if hierarchy.isDerived(key.attr.type._class, core.class.TypeMarkup)}
      {@const markup = typeof value === 'string' ? value : EmptyMarkup}
      <div class="markup-field">
        <span class:required-empty={key.attr.required === true && isEmptyMarkup(markup)}>
          <Label label={key.attr.label} />
          {#if key.attr.required}
            <span class="required-asterisk">*</span>
          {/if}
        </span>
        <MarkupEditor value={markup} {readonly} width="100%" isScrollable={false} onChange={updateField(key)} />
      </div>
    {:else if editor}
      <div class="flex flex-grow min-w-0">
        <Component
          is={editor}
          props={{
            label: key.attr.label,
            placeholder: key.attr.label,
            type: key.attr.type,
            attribute: key.attr,
            attributeKey: key.key,
            object: data,
            value,
            readonly,
            editable: !readonly,
            disabled: readonly,
            kind: 'link',
            size: 'large',
            width: '100%',
            justify: 'left',
            onChange: updateField(key)
          }}
        />
      </div>
    {/if}
  {/each}
{/key}

<style lang="scss">
  .markup-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    margin-top: 0.5rem;
  }

  .required-empty,
  .required-asterisk {
    color: var(--theme-error-color, #eb5757);
  }
</style>
