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
  import { Analytics } from '@hcengineering/analytics'
  import card, { type MasterTag } from '@hcengineering/card'
  import core, { Association, Class, Doc, DocumentQuery, Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { getClient, ObjectCreate } from '@hcengineering/presentation'
  import { Button, IconAdd, Label, Scroller, Section, Switcher, showPopup } from '@hcengineering/ui'
  import { ViewOptions, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { showMenu } from '../actions'
  import { buildRelationCandidatesQuery } from '../relations'
  import { isRelationColumn, reorderRelationColumns } from '../relation-column-order'
  import view from '../plugin'
  import { restrictionStore } from '../utils'
  import DocTable from './DocTable.svelte'
  import MasterDetailView from './masterDetail/MasterDetailView.svelte'
  import ObjectBoxPopup from './ObjectBoxPopup.svelte'
  import ViewletsSettingButton from './ViewletsSettingButton.svelte'

  export let object: Doc
  export let docs: Doc[]
  export let label: IntlString
  export let association: Association
  export let readonly: boolean = false
  export let compactMode: boolean = false
  export let direction: 'A' | 'B'
  export let emptyKind: 'create' | 'placeholder' = 'create'

  const client = getClient()

  $: _class = direction === 'B' ? association.classB : association.classA

  $: uniqueDocs = deduplicate(docs)

  function deduplicate (list: Doc[] | undefined): Doc[] {
    if (list === undefined) return []
    const seen = new Set<string>()
    return list.filter((item) => {
      if (item?._id == null) return false
      if (seen.has(item._id)) return false
      seen.add(item._id)
      return true
    })
  }

  function getCreate (): ObjectCreate | undefined {
    const factory = client.getHierarchy().classHierarchyMixin(_class, view.mixin.ObjectFactory)
    if (factory !== undefined) {
      const usePopup = client.getHierarchy().isDerived(_class, card.class.Card)
      return {
        component: usePopup ? factory.component : undefined,
        func: factory.create,
        label,
        props: { _class, type: _class, space: object.space, changeType: isBaseCardTypeWithSubtypes() }
      }
    }
  }

  function isBaseCardTypeWithSubtypes (): boolean {
    const hierarchy = client.getHierarchy()
    if (!hierarchy.isDerived(_class, card.class.Card)) return false

    const clazz = hierarchy.getClass(_class) as MasterTag | undefined
    if (clazz?.baseType !== true) return false

    return hierarchy.getDescendants(_class).some((descendant) => {
      if (descendant === _class || hierarchy.isMixin(descendant)) return false
      const descendantClass = hierarchy.getClass(descendant) as MasterTag | undefined
      return descendantClass?._class === card.class.MasterTag && descendantClass.removed !== true
    })
  }

  async function add (): Promise<void> {
    const create = getCreate()
    const excludedIds = await getExcludedIds()
    const docQuery = await buildRelationCandidatesQuery(association, direction, excludedIds)

    showPopup(
      ObjectBoxPopup,
      {
        _class,
        docQuery,
        searchMode: 'fulltext',
        docProps: {
          shouldShowAvatar: true,
          type: 'text'
        },
        create
      },
      'top',
      async (result) => {
        if (result != null) {
          const client = getClient()
          await client.createDoc(core.class.Relation, core.space.Workspace, {
            docA: direction === 'B' ? object._id : result._id,
            docB: direction === 'B' ? result._id : object._id,
            association: association._id
          })
        }
      }
    )
  }

  async function getExcludedIds (): Promise<Array<Ref<Doc>>> {
    const excludedIds = new Set<Ref<Doc>>(uniqueDocs.map((doc) => doc._id))
    const hasSingleTarget = association.type === '1:1' || (association.type === '1:N' && direction === 'B')

    if (!hasSingleTarget) return [...excludedIds]

    const relations = await client.findAll(core.class.Relation, { association: association._id })
    for (const relation of relations) {
      excludedIds.add(direction === 'B' ? relation.docB : relation.docA)
    }

    return [...excludedIds]
  }

  let viewlet: WithLookup<Viewlet> | undefined
  let preference: ViewletPreference | undefined = undefined
  let loadingViewlet = true
  let savingColumnOrder = false

  type RelationViewMode = 'table' | 'master-detail'

  let relationViewMode: RelationViewMode = 'table'
  let relationQuery: DocumentQuery<Doc> = {}

  const relationViewOptions: ViewOptions = {
    groupBy: [],
    orderBy: ['', SortingOrder.Ascending]
  }

  $: relationViewStorageKey = `relation-viewlet:${association._id}:${direction}`
  $: relationQuery = { _id: { $in: uniqueDocs.map((doc) => doc._id) } }
  $: masterDetailViewlet = createMasterDetailViewlet(viewlet, _class)

  $: loadRelationViewMode(relationViewStorageKey)

  function loadRelationViewMode (key: string): void {
    const savedMode = localStorage.getItem(key)
    relationViewMode = savedMode === 'master-detail' ? savedMode : 'table'
  }

  function setRelationViewMode (mode: RelationViewMode): void {
    relationViewMode = mode
    localStorage.setItem(relationViewStorageKey, mode)
  }

  function selectRelationViewMode (id: string | number): void {
    setRelationViewMode(id === 'master-detail' ? 'master-detail' : 'table')
  }

  function createMasterDetailViewlet (
    sourceViewlet: WithLookup<Viewlet> | undefined,
    _class: Ref<Class<Doc>>
  ): WithLookup<Viewlet> | undefined {
    if (sourceViewlet === undefined) return undefined

    return {
      ...sourceViewlet,
      descriptor: view.viewlet.MasterDetail,
      masterDetailOptions: {
        views: [
          {
            class: _class,
            view: view.viewlet.Tree
          },
          {
            class: _class,
            view: view.viewlet.Document
          }
        ]
      }
    }
  }

  $: baseClass = client.getHierarchy().getBaseClass(_class)

  $: selectedConfig = preference?.config ?? viewlet?.config
  $: config = selectedConfig?.filter(isRelationColumn)

  async function reorderColumns (from: number, to: number): Promise<void> {
    if (viewlet === undefined || selectedConfig === undefined || loadingViewlet || savingColumnOrder) return
    if (readonly || $restrictionStore.readonly) return
    const reorderedConfig = reorderRelationColumns(selectedConfig, from, to)
    if (reorderedConfig === selectedConfig) return
    const viewletId = viewlet._id

    try {
      savingColumnOrder = true
      const currentPreference =
        preference?.attachedTo === viewletId
          ? preference
          : await client.findOne(view.class.ViewletPreference, {
              space: core.space.Workspace,
              attachedTo: viewletId
            })
      if (currentPreference !== undefined) {
        await client.update(currentPreference, { config: reorderedConfig })
      } else {
        await client.createDoc(view.class.ViewletPreference, core.space.Workspace, {
          attachedTo: viewletId,
          config: reorderedConfig
        })
      }
    } catch (error) {
      Analytics.handleError(error instanceof Error ? error : new Error(String(error)))
    } finally {
      savingColumnOrder = false
    }
  }

  async function onContextMenu (ev: MouseEvent, doc: Doc): Promise<void> {
    const q =
      direction === 'B'
        ? { docA: object._id, docB: doc._id, association: association._id }
        : { docA: doc._id, docB: object._id, association: association._id }
    const relation = await client.findOne(core.class.Relation, q)
    const overrides = new Map()
    const excludedActions: string[] = []
    if (relation !== undefined) {
      if (association.automationOnly === true) {
        excludedActions.push(view.action.Delete)
      } else {
        overrides.set(view.action.Delete, async () => {
          if (relation !== undefined) {
            await client.remove(relation)
          }
        })
      }
    }
    showMenu(ev, { object: doc, overrides, excludedActions })
  }

  function isAllowedToCreate (association: Association, docs: Doc[], direction: 'A' | 'B'): boolean {
    if (association.automationOnly === true) return false
    if (docs.length === 0 || association.type === 'N:N') return true
    if (association.type === '1:1') return false
    return direction === 'B'
  }

  $: allowToCreate = isAllowedToCreate(association, uniqueDocs, direction)

  $: classLabel = client.getHierarchy().getClass(_class).label
</script>

<Section {label}>
  <svelte:fragment slot="header">
    <div class="buttons-group xsmall-gap no-print">
      {#if classLabel}
        <Label label={classLabel} />
      {/if}
      {#if !compactMode}
        <Switcher
          name={`relation-viewlet-${association._id}-${direction}`}
          items={[
            { id: 'table', icon: view.icon.Table },
            { id: 'master-detail', icon: view.icon.MasterDetail }
          ]}
          selected={relationViewMode}
          kind="subtle"
          onlyIcons
          on:select={(event) => {
            selectRelationViewMode(event.detail.id)
          }}
        />
      {/if}
      <ViewletsSettingButton
        viewletQuery={{ attachTo: baseClass }}
        kind="tertiary"
        bind:viewlet
        bind:preference
        bind:loading={loadingViewlet}
      />
      {#if !readonly && allowToCreate}
        <Button id={core.string.AddRelation} icon={IconAdd} kind="ghost" on:click={add} />
      {/if}
    </div>
  </svelte:fragment>

  <svelte:fragment slot="content">
    {#if uniqueDocs?.length > 0 && config != null}
      {#if !compactMode && relationViewMode === 'master-detail' && masterDetailViewlet !== undefined}
        <div class="relation-master-detail">
          <MasterDetailView
            query={relationQuery}
            viewlet={masterDetailViewlet}
            viewOptions={relationViewOptions}
            compactMode
            {readonly}
            reorderable
          />
        </div>
      {:else}
        <Scroller horizontal>
          <DocTable
            objects={uniqueDocs}
            {_class}
            {config}
            {onContextMenu}
            {readonly}
            reorderable
            columnsReorderable={!loadingViewlet && !savingColumnOrder}
            on:column-reorder={(event) => {
              void reorderColumns(event.detail.from, event.detail.to)
            }}
          />
        </Scroller>
      {/if}
    {:else if !readonly || emptyKind === 'placeholder'}
      <div
        class="antiSection-empty clear-mins mt-3"
        class:solid={emptyKind === 'create'}
        class:noBorder={emptyKind === 'placeholder'}
      >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        {#if emptyKind === 'create'}
          <span class="over-underline content-color" on:click={add}>
            <Label label={core.string.AddRelation} />
          </span>
        {:else}
          <span class=" content-color">
            <Label label={view.string.NoRelations} />
          </span>
        {/if}
      </div>
    {/if}
  </svelte:fragment>
</Section>

<style lang="scss">
  .relation-master-detail {
    height: 460px;
    overflow: hidden;
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
  }
</style>
