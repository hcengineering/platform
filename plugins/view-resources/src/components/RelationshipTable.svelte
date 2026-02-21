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
  import contact, { PermissionsStore } from '@hcengineering/contact'
  import core, {
    AnyAttribute,
    AssociationQuery,
    Class,
    Doc,
    DocumentQuery,
    FindOptions,
    Lookup,
    Ref,
    SortingOrder,
    TxOperations,
    TypedSpace,
    WithLookup,
    getObjectValue,
    mergeQueries
  } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient, reduceCalls, updateAttribute } from '@hcengineering/presentation'
  import ui, {
    Button,
    Label,
    Loading,
    eventToHTMLElement,
    lazyObserver,
    resizeObserver,
    showPopup
  } from '@hcengineering/ui'
  import { AttributeModel, BuildModelKey, BuildModelOptions, ViewOptionModel, ViewOptions } from '@hcengineering/view'
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { Readable } from 'svelte/store'
  import { showMenu } from '../actions'
  import { canChangeAttribute } from '../permissions'
  import view from '../plugin'
  import { ViewletContextStore, viewletContextStore } from '../viewletContextStore'
  import { buildConfigAssociation, buildConfigLookup, buildModel, getAttributeValue, restrictionStore } from '../utils'
  import { getResultOptions, getResultQuery } from '../viewOptions'
  import IconUpDown from './icons/UpDown.svelte'
  import RelationsSelectorPopup from './RelationsSelectorPopup.svelte'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let highlightRows: boolean = false
  export let hiddenHeader: boolean = false
  export let options: FindOptions<Doc> | undefined = undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let config: Array<BuildModelKey | string>
  export let tableId: string | undefined = undefined
  export let readonly = false
  export let showFooter = false
  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined
  export let viewOptions: ViewOptions | undefined = undefined

  export let totalQuery: DocumentQuery<Doc> | undefined = undefined

  export let prefferedSorting: string = 'modifiedOn'

  export let limit = 200

  const assoc = '$associations'

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let lookup = buildConfigLookup(hierarchy, _class, config, options?.lookup)
  let associations = buildConfigAssociation(config)

  $: lookup = buildConfigLookup(hierarchy, _class, config, options?.lookup)
  $: associations = buildConfigAssociation(config)

  let _sortKey = prefferedSorting
  let userSorting = false
  $: if (!userSorting) {
    _sortKey = prefferedSorting
  }

  let sortOrder = SortingOrder.Descending
  let loading = 0

  let objects: Doc[] = []
  let gtotal: number = 0
  let total: number = 0
  let objectsRecieved = false

  let rowLimit = 1

  const oldClass = _class
  $: if (oldClass !== _class) {
    rowLimit = 1 // delayed show
  }

  const q = createQuery()

  const dispatch = createEventDispatcher()

  $: sortingFunction = (config.find((it) => typeof it !== 'string' && it.sortingKey === _sortKey) as BuildModelKey)
    ?.sortingFunction

  function getSort (sortKey: string | string[]) {
    return Array.isArray(sortKey)
      ? sortKey.reduce((acc: Record<string, SortingOrder>, val) => {
        acc[val] = sortOrder
        return acc
      }, {})
      : { ...(options?.sort ?? {}), [sortKey]: sortOrder }
  }

  let resultOptions = options

  const update = reduceCalls(async function (
    _class: Ref<Class<Doc>>,
    query: DocumentQuery<Doc>,
    sortKey: string | string[],
    sortOrder: SortingOrder,
    lookup: Lookup<Doc>,
    associations: AssociationQuery[] | undefined,
    limit: number,
    options: FindOptions<Doc> | undefined
  ) {
    const p = await getResultQuery(hierarchy, query, viewOptionsConfig, viewOptions)
    const resultQuery = mergeQueries(p, query)
    loading += q.query(
      _class,
      resultQuery,
      (result) => {
        if (sortingFunction !== undefined) {
          const sf = sortingFunction
          objects = result.sort((a, b) => -1 * sortOrder * sf(a, b))
        } else {
          objects = result
        }
        objectsRecieved = true
        loading = 0
      },
      { limit, ...options, sort: getSort(sortKey), lookup, associations, total: false }
    )
      ? 1
      : 0
  })
  $: void update(_class, query, _sortKey, sortOrder, lookup, associations, limit, resultOptions)

  $: void getResultOptions(options, viewOptionsConfig, viewOptions).then((p) => {
    resultOptions = p
  })

  $: dispatch('content', objects)

  const qSlow = createQuery()
  $: qSlow.query(
    _class,
    query,
    (result) => {
      total = result.total
      if (totalQuery === undefined) {
        gtotal = total
      }
    },
    { limit: 1, ...resultOptions, sort: getSort(_sortKey), lookup, associations, total: true }
  )

  const totalQueryQ = createQuery()
  $: if (totalQuery !== undefined) {
    totalQueryQ.query(
      _class,
      totalQuery,
      (result) => {
        gtotal = result.total === -1 ? 0 : result.total
      },
      {
        ...resultOptions,
        lookup,
        limit: 1,
        total: true
      }
    )
  } else {
    gtotal = total
  }

  function changeSorting (key: string | string[]): void {
    if (key === '') {
      return
    }
    userSorting = true
    if (key !== _sortKey) {
      _sortKey = Array.isArray(key) ? key[0] : key
      sortOrder = SortingOrder.Ascending
    } else {
      sortOrder = sortOrder === SortingOrder.Ascending ? SortingOrder.Descending : SortingOrder.Ascending
    }
  }

  const joinProps = (attribute: AttributeModel, object: Doc, readonly: boolean) => {
    const readonlyParams =
      readonly || (attribute?.attribute?.readonly ?? false)
        ? {
            readonly: true,
            editable: false,
            disabled: true
          }
        : {
            readonly: false,
            editable: true
          }
    if (attribute.collectionAttr || attribute.attribute?.type?._class === core.class.TypeIdentifier) {
      return { object, ...attribute.props, ...readonlyParams }
    }
    if (attribute.attribute?.type._class === core.class.EnumOf) {
      return { ...attribute.props, type: attribute.attribute.type, ...readonlyParams }
    }
    return { ...attribute.props, space: object.space, ...readonlyParams }
  }

  function getValue (attribute: AttributeModel, object: Doc): any {
    return getAttributeValue(attribute, object, client.getHierarchy())
  }

  function showContextMenu (ev: MouseEvent, object: Doc | undefined): void {
    if (object === undefined) return
    showMenu(ev, { object })
  }

  function onChange (value: any, doc: Doc, key: string, attribute: AnyAttribute): void {
    updateAttribute(client, doc, _class, { key, attr: attribute }, value)
  }

  function getOnChange (doc: Doc, attribute: AttributeModel) {
    const attr = attribute.attribute
    if (attr === undefined) return
    if (attribute.collectionAttr) return
    if (attribute.isLookup) return
    if (attribute?.attribute?.readonly === true) return
    const key = attribute.castRequest ? attribute.key.substring(attribute.castRequest.length + 1) : attribute.key
    return (value: any) => {
      onChange(value, doc, key, attr)
    }
  }

  let width: number

  let isBuildingModel = true
  let model: AttributeModel[] | undefined
  let modelOptions: BuildModelOptions | undefined

  const updateModelOptions = reduceCalls(async function updateModelOptions (
    client: TxOperations,
    _class: Ref<Class<Doc>>,
    config: Array<string | BuildModelKey>,
    lookup?: Lookup<Doc>
  ): Promise<void> {
    const newModelOpts = { client, _class, keys: config, lookup }
    if (modelOptions == null || !deepEqual(modelOptions, newModelOpts)) {
      modelOptions = newModelOpts
      await build(modelOptions)
    }
  })
  $: void updateModelOptions(client, _class, config, lookup)

  async function build (modelOptions: BuildModelOptions): Promise<void> {
    isBuildingModel = true
    const res = await buildModel(modelOptions)
    res.sort((a, b) => {
      const indexA = a.key.startsWith(assoc) ? 1 : 0
      const indexB = b.key.startsWith(assoc) ? 1 : 0
      return indexA - indexB
    })
    model = res
    isBuildingModel = false
  }

  let permissionsStore: Readable<PermissionsStore> | undefined = undefined

  onMount(async () => {
    permissionsStore = await getResource(contact.store.Permissions)
  })

  function canChangeAttr (
    object: Doc,
    attr: AnyAttribute | undefined,
    permissionsStore: PermissionsStore | undefined
  ): boolean {
    if (permissionsStore === undefined) return true
    if (attr === undefined) return true
    return canChangeAttribute(attr, object.space as Ref<TypedSpace>, permissionsStore, object._class)
  }

  interface CellModel {
    attribute: AttributeModel
    rowSpan: number
    object: Doc | undefined
    parentObject: Doc | undefined
  }

  interface RowModel {
    cells: CellModel[]
  }

  interface WalkResult {
    rows: RowModel[]
    rowCount: number
  }

  function getView (objects: Doc[], model: AttributeModel[] | undefined): RowModel[] {
    if (model === undefined) return []
    const res: RowModel[] = []
    for (const obj of objects) {
      res.push(...walk(obj, model, undefined).rows)
    }
    return res
  }

  $: viewModel = getView(objects, model)

  function getOwnAttributes (model: AttributeModel[], associationId?: string): AttributeModel[] {
    return model.filter((attr) => {
      if (associationId) return attr.key.startsWith(associationId) && !attr.key.startsWith(`${associationId}.${assoc}`)
      return !attr.key.startsWith(assoc)
    })
  }

  function createLeafResult (doc: Doc | undefined, attrs: AttributeModel[], parent: Doc | undefined): WalkResult {
    return {
      rowCount: 1,
      rows: [
        {
          cells: attrs.map((a) => ({
            attribute: a,
            rowSpan: 1,
            object: doc,
            parentObject: parent
          }))
        }
      ]
    }
  }

  function processBranches (
    doc: Doc | undefined,
    model: AttributeModel[],
    associations: string[],
    associationId?: string
  ): Map<string, WalkResult[]> {
    const branchesByRelation = new Map<string, WalkResult[]>()

    for (const relKey of associations) {
      const relationBranches: WalkResult[] = []

      if (doc !== undefined) {
        const key = associationId ? relKey.substring(associationId.length + 1) : relKey
        const relDocs = getObjectValue(key, doc)
        if (relDocs !== undefined && relDocs.length > 0) {
          for (const child of relDocs) {
            relationBranches.push(walk(child as WithLookup<Doc>, model, relKey, doc))
          }
        } else {
          relationBranches.push(walk(undefined, model, relKey, doc))
        }
      } else {
        relationBranches.push(walk(undefined, model, relKey, doc))
      }

      branchesByRelation.set(relKey, relationBranches)
    }

    return branchesByRelation
  }

  function distributeExtraRows (totalRows: number, existingRows: number): number[] {
    const diff = totalRows - existingRows
    const extraPerRow = new Array(existingRows).fill(0)

    if (diff <= 0) return extraPerRow

    const base = Math.floor(diff / existingRows)
    let remainder = diff % existingRows

    for (let i = 0; i < existingRows; i++) {
      extraPerRow[i] = base + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder--
    }

    return extraPerRow
  }

  function mergeRows (
    doc: Doc | undefined,
    ownAttrs: AttributeModel[],
    branchesByRelation: Map<string, WalkResult[]>,
    parentObject: Doc | undefined
  ): WalkResult {
    let maxRows = 0
    const relationRowCounts = new Map<string, number>()
    const relationExtraRows = new Map<string, number[]>()

    for (const [relKey, branches] of branchesByRelation) {
      const count = branches.reduce((s, b) => s + b.rowCount, 0)
      relationRowCounts.set(relKey, count)
      maxRows = Math.max(maxRows, count)
    }

    for (const [relKey, branches] of branchesByRelation) {
      const count = relationRowCounts.get(relKey) || 0
      const extraRows = distributeExtraRows(maxRows, count)
      relationExtraRows.set(relKey, extraRows)
    }

    const rows: RowModel[] = []

    for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {
      const cellMap = new Map<string, CellModel>()

      if (rowIdx === 0) {
        for (const attr of ownAttrs) {
          cellMap.set(attr.key, {
            attribute: attr,
            rowSpan: maxRows,
            object: doc,
            parentObject
          })
        }
      }

      for (const [relKey, branches] of branchesByRelation) {
        const allBranchRows = branches.flatMap((b) => b.rows)
        const extraRows = relationExtraRows.get(relKey) || []

        let accumulatedExtra = 0
        let branchRowIdx = -1

        for (let i = 0; i < allBranchRows.length; i++) {
          const rowSpan = 1 + (extraRows[i] || 0)
          if (rowIdx >= accumulatedExtra && rowIdx < accumulatedExtra + rowSpan) {
            branchRowIdx = i
            break
          }
          accumulatedExtra += rowSpan
        }

        if (branchRowIdx >= 0) {
          const branchRow = allBranchRows[branchRowIdx]

          let correctAccumulated = 0
          for (let i = 0; i < branchRowIdx; i++) {
            correctAccumulated += 1 + (extraRows[i] || 0)
          }
          const isFirst = rowIdx === correctAccumulated

          if (isFirst) {
            for (const cell of branchRow.cells) {
              const additionalSpan = extraRows[branchRowIdx] || 0
              cellMap.set(cell.attribute.key, {
                ...cell,
                rowSpan: cell.rowSpan + additionalSpan
              })
            }
          }
        }
      }

      rows.push({
        cells: Array.from(cellMap.values())
      })
    }

    return {
      rowCount: maxRows,
      rows
    }
  }

  function getAssociations (model: AttributeModel[], associationId?: string): string[] {
    return model
      .filter((p) => {
        if (associationId) {
          return (
            p.key.startsWith(`${associationId}.${assoc}`) &&
            p.key.split(assoc).filter((p) => p.length).length ===
              associationId.split(assoc).filter((p) => p.length).length + 1
          )
        } else {
          return p.key.startsWith(assoc) && p.key.split(assoc).filter((p) => p.length).length === 1
        }
      })
      .map((p) => p.key)
  }

  function walk (
    doc: WithLookup<Doc> | undefined,
    model: AttributeModel[],
    associationId?: string,
    parent?: Doc
  ): WalkResult {
    const associations = getAssociations(model, associationId)
    const ownAttrs = getOwnAttributes(model, associationId)

    if (associations.length === 0) {
      return createLeafResult(doc, ownAttrs, parent)
    }

    const branchesByRelation = processBranches(doc, model, associations, associationId)

    if (branchesByRelation.size === 0) {
      return createLeafResult(doc, ownAttrs, parent)
    }

    const res = mergeRows(doc, ownAttrs, branchesByRelation, parent)

    return res
  }

  function clickHandler (e: MouseEvent, cell: CellModel): void {
    if (cell.parentObject === undefined) return
    const parts = cell.attribute.key.split('$associations.')
    const association = parts.pop()
    showPopup(
      RelationsSelectorPopup,
      {
        association,
        target: cell.parentObject
      },
      eventToHTMLElement(e)
    )
  }

  $: relationshipTableData =
    model !== undefined && viewModel.length > 0 ? { viewModel, model, objects, cardClass: _class } : undefined

  $: {
    viewletContextStore.update((cur) => {
      const contexts = cur.contexts
      const last = contexts[contexts.length - 1]
      if (last === undefined) return cur
      const updated =
        relationshipTableData !== undefined
          ? { ...last, relationshipTableData }
          : (() => {
              const rest = { ...last }
              delete rest.relationshipTableData
              return rest
            })()
      return new ViewletContextStore([...contexts.slice(0, -1), updated])
    })
  }

  onDestroy(() => {
    viewletContextStore.update((cur) => {
      const contexts = cur.contexts
      const last = contexts[contexts.length - 1]
      if (last?.relationshipTableData !== undefined) {
        const rest = { ...last }
        delete rest.relationshipTableData
        return new ViewletContextStore([...contexts.slice(0, -1), rest])
      }
      return cur
    })
  })
</script>

{#if !model || isBuildingModel}
  <Loading />
{:else}
  <table
    id={tableId}
    use:resizeObserver={(element) => {
      width = element.clientWidth
    }}
    class="antiTable"
    class:highlightRows
  >
    {#if !hiddenHeader}
      <thead class="scroller-thead">
        <tr class="scroller-thead__tr">
          {#each model as attribute, i}
            <th
              class:sortable={attribute.sortingKey}
              class:sorted={attribute.sortingKey === _sortKey}
              class:align-left={attribute.displayProps?.align === 'left'}
              class:align-center={attribute.displayProps?.align === 'center'}
              class:align-right={attribute.displayProps?.align === 'right'}
              class:first={i === 0}
              on:click={() => {
                changeSorting(attribute.sortingKey)
              }}
            >
              <div class="antiTable-cells">
                {#if attribute.label}
                  <Label label={attribute.label} />
                {/if}
                {#if attribute.sortingKey === _sortKey}
                  <div class="icon">
                    <IconUpDown size={'small'} descending={sortOrder === SortingOrder.Descending} />
                  </div>
                {/if}
              </div>
            </th>
          {/each}
        </tr>
      </thead>
    {/if}
    {#if viewModel.length > 0 || objectsRecieved}
      <tbody>
        {#each viewModel as r, row}
          <tr
            class="antiTable-body__row"
            use:lazyObserver={(val) => {
              if (val && row >= rowLimit) {
                rowLimit = row + 10
              }
            }}
          >
            {#if row < rowLimit}
              {#each r.cells as cell, i}
                <td
                  class:align-left={cell.attribute.displayProps?.align === 'left'}
                  class:align-center={cell.attribute.displayProps?.align === 'center'}
                  class:align-right={cell.attribute.displayProps?.align === 'right'}
                  rowspan={cell.rowSpan}
                  class:empty={cell.object === undefined}
                  class:first={i === 0}
                  class:cursor-pointer={cell.parentObject}
                  on:contextmenu={(e) => {
                    showContextMenu(e, cell.object)
                  }}
                  on:click={(e) => {
                    clickHandler(e, cell)
                  }}
                >
                  {#if cell.object}
                    <svelte:component
                      this={cell.attribute.presenter}
                      value={getValue(cell.attribute, cell.object)}
                      onChange={getOnChange(cell.object, cell.attribute)}
                      label={cell.attribute.label}
                      attribute={cell.attribute.attribute}
                      {...joinProps(
                        cell.attribute,
                        cell.object,
                        readonly ||
                          $restrictionStore.readonly ||
                          !canChangeAttr(cell.object, cell.attribute.attribute, $permissionsStore)
                      )}
                    />
                  {/if}
                </td>
              {/each}
            {/if}
          </tr>
        {/each}
      </tbody>
    {/if}
  </table>
  {#if loading > 0}<Loading />{/if}
{/if}
{#if showFooter}
  <div class="space" />
  <div class="footer" style="width: {width}px;">
    <div class="content">
      <span class="select-text">
        <Label label={view.string.Total} params={{ total: gtotal }} />
      </span>

      {#if objects.length > 0 && (total !== gtotal || objects.length < total)}
        <span class="select-text ml-2">
          <Label
            label={view.string.Shown}
            params={{
              total: objects.length === total || total === gtotal ? -1 : total,
              len: objects.length
            }}
          />
        </span>
      {/if}

      {#if objects.length > 0 && objects.length < total}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <Button
          label={ui.string.ShowMore}
          kind={'ghost'}
          size={'small'}
          on:click={() => {
            limit = limit + 100
          }}
        />
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .space {
    flex-grow: 1;
    height: 100%;
  }

  td,
  th {
    border-right: 1px solid var(--theme-trans-color);

    &.first {
      border-left: 1px solid var(--theme-trans-color);
    }
  }

  .empty {
    background-color: var(--theme-link-button-hover);
  }

  .antiTable-body__row {
    border-bottom: 1px solid var(--theme-trans-color);
  }

  .footer {
    width: 100%;
    background-color: var(--theme-comp-header-color);
    display: flex;
    align-items: flex-end;
    height: 2.5rem;
    z-index: 2;
    position: sticky;
    bottom: 0;

    .content {
      display: flex;
      align-items: center;
      width: max-content;
      position: sticky;
      left: 0;
      height: 2.5rem;
    }
  }
</style>
