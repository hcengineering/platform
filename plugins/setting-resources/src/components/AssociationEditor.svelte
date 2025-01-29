<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import core, { Association, Class, Data, Doc, Ref } from '@hcengineering/core'
  import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import {
    Button,
    ButtonKind,
    ButtonSize,
    DropdownIntlItem,
    DropdownLabelsIntl,
    EditBox,
    Label
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import setting from '../plugin'

  export let association: Association | Data<Association>
  export let kind: ButtonKind = 'regular'
  export let size: ButtonSize = 'medium'

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const descendants = hierarchy.getDescendants(core.class.Doc)
  const viewlets = new Set(
    client
      .getModel()
      .findAllSync(view.class.Viewlet, { descriptor: view.viewlet.Table })
      .map((p) => p.attachTo)
  )

  function filterClasses (descendants: Ref<Class<Doc>>[], viewlets: Set<Ref<Class<Doc>>>): DropdownIntlItem[] {
    const result = []
    const added = new Set<Ref<Class<Doc>>>()
    for (const _id of descendants) {
      if (added.has(_id)) continue
      const _class = hierarchy.getClass(_id)
      if (_class.extends !== undefined && added.has(_class.extends)) {
        added.add(_id)
        result.push({ id: _id, label: _class.label })
      }
      if (_class.label === undefined) continue
      if (viewlets.has(hierarchy.getBaseClass(_id))) {
        added.add(_id)
        result.push({ id: _id, label: _class.label })
      }
    }
    return result
  }

  const classes = filterClasses(descendants, viewlets)

  let classA = classes.find((p) => p.id === association.classA) ?? classes[0]
  let classB = classes.find((p) => p.id === association.classB) ?? classes[0]
  let classARef = classA?.id
  let classBRef = classB?.id
  let nameA = association.nameA
  let nameB = association.nameB

  $: editable = !isAssociation(association)

  $: fill(association)

  function fill (association: Association | Data<Association>): void {
    classA = classes.find((p) => p.id === association.classA) ?? classes[0]
    classB = classes.find((p) => p.id === association.classB) ?? classes[0]
    classBRef = classB?.id
    classARef = classA?.id
    nameA = association.nameA
    nameB = association.nameB
  }

  function isAssociation (data: Data<Association> | Association): data is Association {
    return (data as Association)._id !== undefined
  }

  const dispatch = createEventDispatcher()

  async function save (): Promise<void> {
    if (classBRef === undefined || classARef === undefined) {
      return
    }
    if (association !== undefined && isAssociation(association)) {
      await client.diffUpdate(association, {
        nameA,
        nameB
      })
    } else {
      await client.createDoc(core.class.Association, core.space.Model, {
        classA: classARef as Ref<Class<Doc>>,
        classB: classBRef as Ref<Class<Doc>>,
        type: mode,
        nameA,
        nameB
      })
      dispatch('close')
    }
  }

  const items: DropdownIntlItem[] = [
    {
      id: '1:1',
      label: getEmbeddedLabel('1:1')
    },
    {
      id: '1:N',
      label: getEmbeddedLabel('1:N')
    },
    {
      id: 'N:N',
      label: getEmbeddedLabel('N:N')
    }
  ]

  let mode: '1:1' | '1:N' | 'N:N' = (items.find((item) => item.id === association?.type)?.id ?? '1:1') as
    | '1:1'
    | '1:N'
    | 'N:N'
  const label = items.find((item) => item.id === association?.type)?.label ?? ('' as IntlString)
</script>

<div class="flex-between p-4 w-full items-stretch">
  <div class="flex flex-gap-4">
    <div class="flex-col p-4 flex-gap-2">
      <div class="flex-col-center">A</div>
      <div>
        <EditBox bind:value={nameA} placeholder={core.string.Name} kind={'default'} />
      </div>
      <div>
        {#if editable}
          <DropdownLabelsIntl
            label={core.string.Class}
            items={classes}
            width="8rem"
            bind:selected={classARef}
            {kind}
            {size}
          />
        {:else if classA}
          <Label label={classA.label} />
        {/if}
      </div>
    </div>

    <div class="flex-col p-4 flex-gap-2">
      <span class="label">
        <Label label={setting.string.Type} />
      </span>
      {#if editable}
        <DropdownLabelsIntl
          selected={mode}
          {items}
          {kind}
          {size}
          label={setting.string.Type}
          on:selected={(res) => {
            mode = res.detail
          }}
        />
      {:else}
        <Label {label} />
      {/if}
    </div>

    <div class="flex-col p-4 flex-gap-2">
      <div class="flex-col-center">B</div>
      <div>
        <EditBox bind:value={nameB} placeholder={core.string.Name} kind={'default'} />
      </div>
      <div>
        {#if editable}
          <DropdownLabelsIntl
            label={core.string.Class}
            items={classes}
            width="8rem"
            bind:selected={classBRef}
            {kind}
            {size}
          />
        {:else if classB}
          <Label label={classB.label} />
        {/if}
      </div>
    </div>
  </div>

  <div class="flex-col-reverse">
    <Button label={presentation.string.Save} kind={'primary'} size={'medium'} on:click={save} />
  </div>
</div>
