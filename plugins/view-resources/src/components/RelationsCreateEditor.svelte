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
-->
<!--
  Relation picker for documents that do not exist yet.

  `RelationsEditor` attaches relations to an existing document and writes `Relation` docs
  immediately. In a create dialog there is no `docA`/`docB` yet, so this component buffers the
  selection instead and exposes it via `bind:selection`; the caller writes it out with
  `commitPendingRelations` in the same transaction that creates the document.

  Associations are discovered exactly like `RelationsEditor` does — by the ancestors of `_class` —
  and candidates are narrowed by the association's `filterA`/`filterB`.
-->
<script lang="ts">
  import core, { type Association, type Class, type Doc, type Ref } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Button, IconAdd, IconClose, Label, showPopup } from '@hcengineering/ui'

  import { buildRelationCandidatesQuery, getRelationCandidatesClass, type PendingRelation } from '../relations'
  import ObjectBox from './ObjectBox.svelte'
  import ObjectBoxPopup from './ObjectBoxPopup.svelte'

  export let _class: Ref<Class<Doc>>
  export let selection: PendingRelation[] = []
  export let readonly: boolean = false

  interface Row {
    association: Association
    direction: 'A' | 'B'
    label: string
    candidatesClass: Ref<Class<Doc>>
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: rows = getRows(_class)

  function getRows (_class: Ref<Class<Doc>>): Row[] {
    const parents = hierarchy.getAncestors(_class)
    const model = client.getModel()

    const asB = model
      .findAllSync(core.class.Association, { classA: { $in: parents } })
      .filter((a) => a.nameB.trim().length > 0)
      .map((association) => toRow(association, 'B'))
    const asA = model
      .findAllSync(core.class.Association, { classB: { $in: parents } })
      .filter((a) => a.nameA.trim().length > 0)
      .map((association) => toRow(association, 'A'))

    return [...asB, ...asA]
  }

  function toRow (association: Association, direction: 'A' | 'B'): Row {
    return {
      association,
      direction,
      label: direction === 'B' ? association.nameB : association.nameA,
      candidatesClass: getRelationCandidatesClass(association, direction)
    }
  }

  function keyOf (row: Row): string {
    return `${row.association._id}_${row.direction}`
  }

  // Reactive map so picked documents render immediately (a function call inside the each-block
  // would not track `selection`).
  $: picked = new Map<string, Array<Ref<Doc>>>(
    rows.map((row) => [
      keyOf(row),
      selection.filter((s) => s.association === row.association._id && s.direction === row.direction).map((s) => s.doc)
    ])
  )

  async function add (row: Row): Promise<void> {
    const current = picked.get(keyOf(row)) ?? []
    const docQuery = await buildRelationCandidatesQuery(row.association, row.direction, current)

    showPopup(
      ObjectBoxPopup,
      {
        _class: row.candidatesClass,
        docQuery,
        searchMode: 'fulltext',
        docProps: { shouldShowAvatar: true, type: 'text' }
      },
      'top',
      (result: any) => {
        if (result == null) return
        const entry: PendingRelation = {
          association: row.association._id,
          direction: row.direction,
          doc: result._id
        }
        // A 1:1 association holds a single document per side — replace instead of appending.
        const rest =
          row.association.type === '1:1'
            ? selection.filter((s) => !(s.association === row.association._id && s.direction === row.direction))
            : selection
        selection = [...rest, entry]
      }
    )
  }

  function remove (row: Row, doc: Ref<Doc>): void {
    selection = selection.filter(
      (s) => !(s.association === row.association._id && s.direction === row.direction && s.doc === doc)
    )
  }
</script>

{#each rows as row (keyOf(row))}
  <div class="flex-row-center flex-gap-2 flex-wrap">
    <span class="content-dark-color text-sm">
      <Label label={getEmbeddedLabel(row.label)} />
    </span>

    {#each picked.get(keyOf(row)) ?? [] as doc (doc)}
      <div class="flex-row-center flex-gap-1">
        <ObjectBox
          value={doc}
          _class={row.candidatesClass}
          label={getEmbeddedLabel(row.label)}
          readonly
          kind={'regular'}
          size={'small'}
          showNavigate={false}
          docProps={{ type: 'text' }}
        />
        {#if !readonly}
          <Button
            icon={IconClose}
            kind={'ghost'}
            size={'small'}
            on:click={() => {
              remove(row, doc)
            }}
          />
        {/if}
      </div>
    {/each}

    {#if !readonly}
      <Button
        id={core.string.AddRelation}
        icon={IconAdd}
        label={core.string.AddRelation}
        kind={'ghost'}
        size={'small'}
        on:click={() => {
          void add(row)
        }}
      />
    {/if}
  </div>
{/each}
