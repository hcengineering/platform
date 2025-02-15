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
    Label,
    NestedDropdown
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import card from '@hcengineering/card'
  import { createEventDispatcher } from 'svelte'
  import setting from '../plugin'

  export let association: Association | Data<Association>
  export let kind: ButtonKind = 'regular'
  export let size: ButtonSize = 'medium'
  export let _classes: Ref<Class<Doc>>[] = [core.class.Doc]
  export let exclude: Ref<Class<Doc>>[] = [card.class.Card]

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const descendants = new Set(_classes.map((p) => hierarchy.getDescendants(p)).reduce((a, b) => a.concat(b)))
  const viewlets = new Set(
    client
      .getModel()
      .findAllSync(view.class.Viewlet, { descriptor: view.viewlet.Table })
      .map((p) => p.attachTo)
  )

  function filterClasses (
    descendants: Set<Ref<Class<Doc>>>,
    viewlets: Set<Ref<Class<Doc>>>,
    exclude: Ref<Class<Doc>>[]
  ): [DropdownIntlItem, DropdownIntlItem[]][] {
    const ignore = new Set<Ref<Class<Doc>>>()
    const added = new Set<Ref<Class<Doc>>>()
    const base = new Map<Ref<Class<Doc>>, Class<Doc>[]>()
    for (const excluded of exclude) {
      const desc = hierarchy.getDescendants(excluded)
      for (const _id of desc) {
        ignore.add(_id)
      }
    }
    for (const _id of descendants) {
      if (added.has(_id) || ignore.has(_id)) continue
      const _class = hierarchy.getClass(_id)
      if (_class.label === undefined) continue
      if (viewlets.has(hierarchy.getBaseClass(_id))) {
        added.add(_id)
        const descendants = hierarchy.getDescendants(_id)
        const toAdd: Class<Doc>[] = []
        for (const desc of descendants) {
          if (added.has(desc) || ignore.has(desc)) continue
          const _class = hierarchy.getClass(desc)
          if (_class.label === undefined) continue
          added.add(desc)
          toAdd.push(_class)
        }
        base.set(_id, toAdd)
      }
    }
    const result: [DropdownIntlItem, DropdownIntlItem[]][] = []
    for (const [key, value] of base) {
      try {
        const clazz = hierarchy.getClass(key)
        result.push([{ id: key, label: clazz.label }, value.map((it) => ({ id: it._id, label: it.label }))])
      } catch {}
    }
    return result
  }

  const classes = filterClasses(descendants, viewlets, exclude)

  let classARef: Ref<Class<Doc>> | undefined = undefined
  let classBRef: Ref<Class<Doc>> | undefined = undefined
  let nameA = association.nameA
  let nameB = association.nameB

  $: classA = isEmptyClass(classARef) ? undefined : hierarchy.getClass(classARef as Ref<Class<Doc>>)
  $: classB = isEmptyClass(classBRef) ? undefined : hierarchy.getClass(classBRef as Ref<Class<Doc>>)

  function isEmptyClass (ref: Ref<Class<Doc>> | undefined): boolean {
    return ref === undefined || ref !== ''
  }

  $: editable = !isAssociation(association)

  $: fill(association)

  function fill (association: Association | Data<Association>): void {
    classBRef = !isEmptyClass(association.classB) ? association.classB : undefined
    classARef = !isEmptyClass(association.classA) ? association.classA : undefined
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
        classA: classARef,
        classB: classBRef,
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
          <NestedDropdown
            items={classes}
            on:selected={(e) => {
              classARef = e.detail
            }}
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
          <NestedDropdown
            items={classes}
            on:selected={(e) => {
              classBRef = e.detail
            }}
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
