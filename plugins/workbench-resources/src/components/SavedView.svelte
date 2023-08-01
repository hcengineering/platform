<script lang="ts">
  import { Ref, getCurrentAccount, toIdMap } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import {
    Action,
    IconAdd,
    Location,
    eventToHTMLElement,
    location,
    navigate,
    showPopup,
    SelectPopup,
    getEventPopupPositionElement
  } from '@hcengineering/ui'
  import view, { Filter, FilteredView, ViewOptions, Viewlet } from '@hcengineering/view'
  import {
    TreeItem,
    TreeNode,
    activeViewlet,
    filterStore,
    getViewOptions,
    makeViewletKey,
    selectedFilterStore,
    setActiveViewletId,
    setFilters,
    setViewOptions,
    viewOptionStore,
    EditBoxPopup
  } from '@hcengineering/view-resources'
  import { Application } from '@hcengineering/workbench'
  import copy from 'fast-copy'
  import { createEventDispatcher } from 'svelte'
  import contact from '@hcengineering/contact'

  export let currentApplication: Application | undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const me = getCurrentAccount()._id

  const filteredViewsQuery = createQuery()
  let availableFilteredViews: FilteredView[] = []
  let myFilteredViews: FilteredView[] = []
  $: filteredViewsQuery.query(view.class.FilteredView, { attachedTo: currentApplication?.alias }, (result) => {
    myFilteredViews = result.filter((p) => p.users.includes(me))
    availableFilteredViews = result.filter((p) => p.sharable && !p.users.includes(me))
  })

  async function removeAction (filteredView: FilteredView): Promise<Action[]> {
    return [
      {
        icon: view.icon.Delete,
        label: setting.string.Delete,
        action: async (ctx: any, evt: Event) => {
          await client.remove(filteredView)
        }
      }
    ]
  }

  async function renameAction (object: FilteredView, originalEvent: MouseEvent | undefined): Promise<Action[]> {
    return [
      {
        icon: contact.icon.Edit,
        label: view.string.Rename,
        action: async (ctx: any, evt: Event) => {
          showPopup(
            EditBoxPopup,
            { value: object.name, format: 'text' },
            getEventPopupPositionElement(originalEvent ?? evt),
            async (res) => {
              if (res !== undefined) {
                await client.update(object, { name: res })
              }
            }
          )
        }
      }
    ]
  }

  async function viewAction (filteredView: FilteredView, originalEvent: MouseEvent | undefined): Promise<Action[]> {
    const rename = await renameAction(filteredView, originalEvent)
    if (filteredView.createdBy === me) {
      const remove = await removeAction(filteredView)
      return [...remove, ...rename]
    }
    return await hideAction(filteredView)
  }

  async function hideAction (object: FilteredView): Promise<Action[]> {
    return [
      {
        icon: view.icon.Archive,
        label: view.string.Hide,
        action: async (ctx: any, evt: Event) => {
          await client.update(object, { $pull: { users: me } })
        }
      }
    ]
  }

  let selectedId: Ref<FilteredView> | undefined = undefined

  async function load (fv: FilteredView): Promise<void> {
    selectedFilterStore.set(fv)
    navigate({
      path: fv.location.path,
      query: fv.location.query ?? undefined,
      fragment: fv.location.fragment ?? undefined
    })
    if (fv.viewletId !== undefined && fv.viewletId !== null) {
      const viewlet = await client.findOne(view.class.Viewlet, { _id: fv.viewletId })
      setActiveViewletId(fv.viewletId, fv.location)
      if (viewlet !== undefined && fv.viewOptions !== undefined) {
        setViewOptions(viewlet, copy(fv.viewOptions))
      }
    }
    setFilters(JSON.parse(fv.filters))
  }

  const clearSelection = () => {
    selectedFilterStore.set(undefined)
    selectedId = undefined
    dispatch('select', false)
  }

  function checkFilter (
    fv: FilteredView,
    loc: Location,
    filters: string,
    viewOptionStore: Map<string, ViewOptions>
  ): boolean {
    if (fv.location.path.join() !== loc.path.join()) return false
    if (fv.filters !== filters) return false
    const key = makeViewletKey(loc)
    if (fv.viewletId !== $activeViewlet[key]) return false
    if (fv.viewletId !== null) {
      const viewOptions = getViewOptions({ _id: fv.viewletId } as Viewlet, viewOptionStore)
      if (JSON.stringify(fv.viewOptions) !== JSON.stringify(viewOptions)) return false
    }
    return true
  }

  function checkSelected (
    fs: Filter[],
    loc: Location,
    filteredViews: FilteredView[] | undefined,
    viewOptionStore: Map<string, ViewOptions>
  ) {
    const filters = JSON.stringify(fs)
    if (loc && Array.isArray(fs) && fs.length > 0 && Array.isArray(filteredViews)) {
      if ($selectedFilterStore !== undefined) {
        if ($selectedFilterStore.location.path.join() === loc.path.join()) {
          selectedId = $selectedFilterStore._id
          dispatch('select', true)
          return
        }
      }
      for (const fv of filteredViews) {
        if (checkFilter(fv, loc, filters, viewOptionStore)) {
          selectedId = fv._id
          dispatch('select', true)
          return
        }
      }
      clearSelection()
    } else {
      clearSelection()
    }
  }

  $: checkSelected($filterStore, $location, myFilteredViews, $viewOptionStore)

  $: shown = myFilteredViews.length > 0 || availableFilteredViews.length > 0
  $: dispatch('shown', shown)

  async function getActions (availableFilteredViews: FilteredView[]): Promise<Action[]> {
    if (availableFilteredViews.length > 0) {
      const filteredViewsIdMap = toIdMap(availableFilteredViews)
      const pushMeToFV = async (id: Ref<FilteredView>) => {
        if (id === undefined) return
        const filteredView = filteredViewsIdMap.get(id)
        if (filteredView) await client.update(filteredView, { $push: { users: me } })
      }
      const value = availableFilteredViews.map((p) => ({
        id: p._id,
        text: p.name
      }))
      const add: Action = {
        label: view.string.AddSavedView,
        icon: IconAdd,
        action: async (_, e): Promise<void> => {
          showPopup(SelectPopup, { value, searchable: true }, eventToHTMLElement(e as MouseEvent), pushMeToFV)
        }
      }
      return [add]
    } else {
      return []
    }
  }
</script>

{#if shown}
  <TreeNode label={view.string.FilteredViews} parent actions={async () => getActions(availableFilteredViews)}>
    {#each myFilteredViews as fv}
      <TreeItem
        _id={fv._id}
        title={fv.name}
        selected={selectedId === fv._id}
        on:click={() => load(fv)}
        actions={(ov) => viewAction(fv, ov)}
      />
    {/each}
  </TreeNode>
{/if}
