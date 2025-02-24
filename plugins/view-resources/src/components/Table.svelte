<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import core, {
    AnyAttribute,
    Class,
    Doc,
    DocumentQuery,
    FindOptions,
    Lookup,
    Ref,
    SortingOrder,
    TxOperations,
    getObjectValue,
    mergeQueries
  } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { createQuery, getClient, reduceCalls, updateAttribute } from '@hcengineering/presentation'
  import ui, {
    Button,
    CheckBox,
    Component,
    Label,
    Loading,
    Spinner,
    lazyObserver,
    mouseAttractor,
    resizeObserver
  } from '@hcengineering/ui'
  import { AttributeModel, BuildModelKey, BuildModelOptions, ViewOptionModel, ViewOptions } from '@hcengineering/view'
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher } from 'svelte'
  import { showMenu } from '../actions'
  import view from '../plugin'
  import { LoadingProps, buildConfigLookup, buildModel, restrictionStore } from '../utils'
  import IconUpDown from './icons/UpDown.svelte'
  import { getResultOptions, getResultQuery } from '../viewOptions'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let enableChecking: boolean = false
  export let showNotification: boolean = false
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

  // If defined, will show a number of dummy items before real data will appear.
  export let loadingProps: LoadingProps | undefined = undefined

  export let selection: number | undefined = undefined
  export let checked: Doc[] = []

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: lookup = buildConfigLookup(hierarchy, _class, config, options?.lookup)

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
  const refs: HTMLElement[] = []

  let rowLimit = 1

  const oldClass = _class
  $: if (oldClass !== _class) {
    rowLimit = 1 // delayed show
  }

  $: refs.length = objects.length

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
      { limit, ...options, sort: getSort(sortKey), lookup, total: false }
    )
      ? 1
      : 0
  })
  $: void update(_class, query, _sortKey, sortOrder, lookup, limit, resultOptions)

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
    { limit: 1, ...resultOptions, sort: getSort(_sortKey), lookup, total: true }
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

  const showContextMenu = async (ev: MouseEvent, object: Doc, row: number): Promise<void> => {
    selection = row
    if (!checkedSet.has(object._id)) {
      check(objects, false)
      checked = []
    }
    const items = checked.length > 0 ? checked : object
    showMenu(ev, { object: items, baseMenuClass })
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

  $: checkedSet = new Set<Ref<Doc>>(checked.map((it) => it._id))
  $: allItemsSelected = objects?.length === checkedSet.size && objects?.length > 0

  export function check (docs: Doc[], value: boolean) {
    if (!enableChecking) return
    dispatch('check', { docs, value })
  }

  function getLoadingLength (props: LoadingProps, options?: FindOptions<Doc>): number {
    if (options?.limit !== undefined && options?.limit > 0) {
      return Math.min(options?.limit, props.length)
    }
    return props.length
  }
  function onRow (object: Doc): void {
    dispatch('row-focus', object)
  }

  export function select (offset: 1 | -1 | 0, of?: Doc, noScroll?: boolean): void {
    let pos = (of !== undefined ? objects.findIndex((it) => it._id === of._id) : selection) ?? -1
    pos += offset
    if (pos < 0) {
      pos = 0
    }
    if (pos >= objects.length) {
      pos = objects.length - 1
    }
    const r = refs[pos]
    selection = pos
    onRow(objects[pos])
    if (r !== undefined && !noScroll) {
      r?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
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
        : {}
    if (attribute.collectionAttr) {
      return { object, ...attribute.props, ...readonlyParams }
    }
    if (attribute.attribute?.type._class === core.class.EnumOf) {
      return { ...attribute.props, type: attribute.attribute.type, ...readonlyParams }
    }
    return { ...attribute.props, space: object.space, ...readonlyParams }
  }
  function getValue (attribute: AttributeModel, object: Doc): any {
    if (attribute.castRequest) {
      return getObjectValue(
        attribute.key.substring(attribute.castRequest.length + 1),
        client.getHierarchy().as(object, attribute.castRequest)
      )
    }
    return getObjectValue(attribute.key, object)
  }

  function onChange (value: any, doc: Doc, key: string, attribute: AnyAttribute): void {
    updateAttribute(client, doc, _class, { key, attr: attribute }, value)
  }

  function getOnChange (doc: Doc, attribute: AttributeModel) {
    const attr = attribute.attribute
    if (attr === undefined) return
    if (attribute.collectionAttr) return
    if (attribute.isLookup) return
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
    model = res
    isBuildingModel = false
  }

  function contextHandler (object: Doc, row: number): (ev: MouseEvent) => void {
    return (ev) => {
      if (!readonly) {
        void showContextMenu(ev, object, row)
      }
    }
  }
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
    class:metaColumn={enableChecking || showNotification}
    class:highlightRows
  >
    {#if !hiddenHeader}
      <thead class="scroller-thead">
        <tr class="scroller-thead__tr">
          {#if enableChecking || showNotification}
            <th>
              {#if enableChecking && objects?.length > 0}
                <div class="antiTable-cells__checkCell" class:checkall={checkedSet.size > 0}>
                  <CheckBox
                    symbol={allItemsSelected ? 'check' : 'minus'}
                    checked={checkedSet.size > 0}
                    on:value={(event) => {
                      check(objects, event.detail)
                    }}
                  />
                </div>
              {/if}
            </th>
          {/if}
          {#each model as attribute}
            <th
              class:w-full={attribute.displayProps?.grow === true}
              class:sortable={attribute.sortingKey}
              class:sorted={attribute.sortingKey === _sortKey}
              class:align-left={attribute.displayProps?.align === 'left'}
              class:align-center={attribute.displayProps?.align === 'center'}
              class:align-right={attribute.displayProps?.align === 'right'}
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
    {#if objects.length > 0 || objectsRecieved}
      <tbody>
        {#each objects as object, row (object._id)}
          <tr
            class="antiTable-body__row"
            class:checking={checkedSet.has(object._id)}
            class:fixed={row === selection}
            class:selected={row === selection}
            on:mouseover={mouseAttractor(() => {
              onRow(object)
            })}
            on:mouseenter={mouseAttractor(() => {
              onRow(object)
            })}
            on:focus={() => {}}
            bind:this={refs[row]}
            on:contextmenu={contextHandler(object, row)}
            use:lazyObserver={(val) => {
              if (val && row >= rowLimit) {
                rowLimit = row + 10
              }
            }}
          >
            {#if enableChecking || showNotification}
              <td class="relative">
                {#if showNotification}
                  <div class="antiTable-cells__notifyCell">
                    {#if enableChecking}
                      <div class="antiTable-cells__checkCell">
                        <CheckBox
                          checked={checkedSet.has(object._id)}
                          on:value={(event) => {
                            check([object], event.detail)
                          }}
                        />
                      </div>
                    {/if}
                    <Component
                      is={notification.component.NotificationPresenter}
                      props={{ value: object, kind: enableChecking ? 'table' : 'block' }}
                    />
                  </div>
                {:else}
                  <div class="antiTable-cells__checkCell">
                    <CheckBox
                      checked={checkedSet.has(object._id)}
                      on:value={(event) => {
                        check([object], event.detail)
                      }}
                    />
                  </div>
                {/if}
              </td>
            {/if}
            {#if row < rowLimit}
              {#each model as attribute, cell}
                <td
                  class:align-left={attribute.displayProps?.align === 'left'}
                  class:align-center={attribute.displayProps?.align === 'center'}
                  class:align-right={attribute.displayProps?.align === 'right'}
                >
                  <div class:antiTable-cells__firstCell={!cell}>
                    <!-- {getOnChange(object, attribute) !== undefined} -->
                    <svelte:component
                      this={attribute.presenter}
                      value={getValue(attribute, object)}
                      onChange={getOnChange(object, attribute)}
                      label={attribute.label}
                      {...joinProps(attribute, object, readonly || $restrictionStore.readonly)}
                    />
                  </div>
                </td>
              {/each}
            {/if}
          </tr>
        {/each}
      </tbody>
    {:else if loadingProps !== undefined}
      <tbody>
        {#each Array(getLoadingLength(loadingProps, options)) as i, row}
          <tr class="antiTable-body__row" class:fixed={row === selection}>
            {#each model as attribute, cell}
              {#if !cell}
                {#if enableChecking}
                  <td>
                    <div class="antiTable-cells__checkCell">
                      <CheckBox checked={false} />
                    </div>
                  </td>
                {/if}
                <td id={`loader-${i}-${attribute.key}`}>
                  <Spinner size="small" />
                </td>
              {/if}
            {/each}
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
    <div class="content" class:padding={showNotification || enableChecking}>
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
      &.padding {
        padding-left: 2.5rem;
      }
    }
  }
</style>
