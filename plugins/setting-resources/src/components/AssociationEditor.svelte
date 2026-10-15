<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import core, { Association, Class, Data, Doc, Ref } from '@hcengineering/core'
  import { getEmbeddedLabel, translateCB } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import {
    Button,
    ButtonKind,
    ButtonSize,
    DropdownIntlItem,
    DropdownLabelsIntl,
    EditBox,
    IconAdd,
    IconClose,
    Label,
    NestedDropdown,
    themeStore,
    Toggle,
    eventToHTMLElement,
    showPopup
  } from '@hcengineering/ui'
  import view, { type Filter } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { FilterTypePopup } from '@hcengineering/view-resources'
  import setting from '../plugin'

  export let association: Association | Data<Association>
  export let kind: ButtonKind = 'regular'
  export let size: ButtonSize = 'medium'
  export let _classes: Ref<Class<Doc>>[] = [core.class.Doc]
  export let exclude: Ref<Class<Doc>>[] = []

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
      if (hierarchy.getAncestors(_id).some((a) => viewlets.has(a))) {
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
  let mode: Association['type'] = association.type
  let description = ''
  let automationOnly = association.automationOnly ?? false
  let filterA = association.filterA
  let filterB = association.filterB

  $: classA = isEmptyClass(classARef) ? undefined : hierarchy.getClass(classARef as Ref<Class<Doc>>)
  $: classB = isEmptyClass(classBRef) ? undefined : hierarchy.getClass(classBRef as Ref<Class<Doc>>)

  function isEmptyClass (ref: Ref<Class<Doc>> | undefined): boolean {
    return ref === undefined || ref === ''
  }

  $: editable = !isAssociation(association)

  $: fill(association)

  function fill (association: Association | Data<Association>): void {
    classBRef = !isEmptyClass(association.classB) ? association.classB : undefined
    classARef = !isEmptyClass(association.classA) ? association.classA : undefined
    nameA = association.nameA
    nameB = association.nameB
    mode = association.type

    translateCB(association.description ?? getEmbeddedLabel(''), {}, $themeStore.language, (p) => {
      description = p
    })
    automationOnly = association.automationOnly ?? false
    filterA = association.filterA
    filterB = association.filterB
  }

  function parseFilters (filter: string | undefined): Filter[] {
    if (filter == null || filter === '') return []
    try {
      return JSON.parse(filter) as Filter[]
    } catch {
      return []
    }
  }

  function serializeFilters (filters: Filter[]): string | undefined {
    if (filters.length === 0) return undefined
    return JSON.stringify(filters, (k, v) => (k === 'onRemove' ? undefined : v))
  }

  function setFilters (side: 'A' | 'B', filters: Filter[]): void {
    if (side === 'A') {
      filterA = serializeFilters(filters)
    } else {
      filterB = serializeFilters(filters)
    }
  }

  function addFilter (side: 'A' | 'B', e: MouseEvent): void {
    const _class = side === 'A' ? classARef : classBRef
    if (_class === undefined) return
    const existing = parseFilters(side === 'A' ? filterA : filterB)
    const target = eventToHTMLElement(e)
    showPopup(
      FilterTypePopup,
      {
        _class,
        target,
        index: existing.length + 1,
        onChange: (f: Filter) => {
          setFilters(side, [...existing, f])
        }
      },
      target
    )
  }

  function removeFilter (side: 'A' | 'B', i: number): void {
    setFilters(
      side,
      parseFilters(side === 'A' ? filterA : filterB).filter((_, idx) => idx !== i)
    )
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
        nameB,
        type: mode,
        description: description.trim().length > 0 ? getEmbeddedLabel(description.trim()) : undefined,
        automationOnly,
        filterA,
        filterB
      })
    } else {
      await client.createDoc(core.class.Association, core.space.Model, {
        classA: classARef,
        classB: classBRef,
        type: mode,
        nameA,
        nameB,
        description: description.trim().length > 0 ? getEmbeddedLabel(description.trim()) : undefined,
        automationOnly,
        filterA,
        filterB
      })
      dispatch('create')
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
</script>

<div class="flex-between p-4 w-full items-stretch">
  <div class="flex-col flex-grow min-w-0 flex-gap-2">
    <div class="flex-row-center items-stretch flex-gap-4 w-full p-4">
      <div class="flex-col flex-grow min-w-0 flex-gap-2" style:flex="1 1 0">
        <div class="flex-center">A</div>
        <div class="w-full">
          <EditBox bind:value={nameA} placeholder={core.string.Name} kind={'default'} maxWidth="100%" fullSize />
        </div>
        <div class="w-full">
          {#if editable}
            <NestedDropdown
              items={classes}
              width="100%"
              on:selected={(e) => {
                classARef = e.detail
              }}
            />
          {:else if classA}
            <Label label={classA.label} />
          {/if}
        </div>
        <div class="flex-col flex-gap-1">
          <span class="label">
            <Label label={setting.string.RelationFilter} />
          </span>
          <div class="flex-row-center flex-gap-1 flex-wrap">
            {#each parseFilters(filterA) as f, i (i)}
              <div class="flex-row-center filter-chip">
                <Label label={f.key?.label ?? setting.string.RelationFilter} />
                <Button
                  icon={IconClose}
                  kind={'ghost'}
                  size={'small'}
                  on:click={() => {
                    removeFilter('A', i)
                  }}
                />
              </div>
            {/each}
            <Button
              icon={IconAdd}
              label={setting.string.AddRelationFilter}
              kind={'ghost'}
              size={'small'}
              disabled={classARef === undefined}
              on:click={(e) => {
                addFilter('A', e)
              }}
            />
          </div>
        </div>
      </div>

      <div class="flex-col flex-no-shrink flex-gap-2">
        <div class="flex-center">
          <Label label={setting.string.Type} />
        </div>
        <div>
          <DropdownLabelsIntl
            selected={mode}
            {items}
            {kind}
            {size}
            on:selected={(res) => {
              mode = res.detail
            }}
          />
        </div>
        <div />
      </div>

      <div class="flex-col flex-grow min-w-0 flex-gap-2" style:flex="1 1 0">
        <div class="flex-center">B</div>
        <div class="w-full">
          <EditBox bind:value={nameB} placeholder={core.string.Name} kind={'default'} maxWidth="100%" fullSize />
        </div>
        <div class="w-full">
          {#if editable}
            <NestedDropdown
              items={classes}
              width="100%"
              on:selected={(e) => {
                classBRef = e.detail
              }}
            />
          {:else if classB}
            <Label label={classB.label} />
          {/if}
        </div>
      </div>
      <div class="flex-col flex-gap-1">
        <span class="label">
          <Label label={setting.string.RelationFilter} />
        </span>
        <div class="flex-row-center flex-gap-1 flex-wrap">
          {#each parseFilters(filterB) as f, i (i)}
            <div class="flex-row-center filter-chip">
              <Label label={f.key?.label ?? setting.string.RelationFilter} />
              <Button
                icon={IconClose}
                kind={'ghost'}
                size={'small'}
                on:click={() => {
                  removeFilter('B', i)
                }}
              />
            </div>
          {/each}
          <Button
            icon={IconAdd}
            label={setting.string.AddRelationFilter}
            kind={'ghost'}
            size={'small'}
            disabled={classBRef === undefined}
            on:click={(e) => {
              addFilter('B', e)
            }}
          />
        </div>
      </div>
    </div>

    <div class="flex-col px-4 pb-2 flex-gap-2">
      <span class="label">
        <Label label={core.string.Description} />
      </span>
      <EditBox
        bind:value={description}
        placeholder={core.string.Description}
        kind={'default'}
        format={'text-multiline'}
      />
    </div>
    <div class="px-4 pt-2 pb-4 flex-between items-center">
      <span class="label">
        <Label label={view.string.AutomationOnly} />
      </span>
      <Toggle bind:on={automationOnly} />
    </div>
  </div>

  <div class="flex-col-reverse">
    <Button label={presentation.string.Save} kind={'primary'} size={'medium'} on:click={save} />
  </div>
</div>

<style lang="scss">
  .filter-chip {
    padding: 0 0.25rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
  }
</style>
