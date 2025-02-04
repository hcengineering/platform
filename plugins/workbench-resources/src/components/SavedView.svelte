<script lang="ts">
  import contact, { includesAny } from '@hcengineering/contact'
  import { Ref, getCurrentAccount, toIdMap } from '@hcengineering/core'
  import { copyTextToClipboard, createQuery, getClient } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import {
    Action,
    IconAdd,
    Location,
    SelectPopup,
    eventToHTMLElement,
    getEventPopupPositionElement,
    getLocation,
    getPopupPositionElement,
    location,
    locationToUrl,
    navigate,
    showPopup
  } from '@hcengineering/ui'
  import view, { Filter, FilteredView, ViewOptions, Viewlet } from '@hcengineering/view'
  import {
    EditBoxPopup,
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
    viewOptionStore
  } from '@hcengineering/view-resources'
  import { Application } from '@hcengineering/workbench'
  import copy from 'fast-copy'
  import { createEventDispatcher } from 'svelte'
  import TodoCheck from './icons/TodoCheck.svelte'
  import TodoUncheck from './icons/TodoUncheck.svelte'

  export let currentApplication: Application | undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const myAcc = getCurrentAccount()

  const filteredViewsQuery = createQuery()
  let availableFilteredViews: FilteredView[] = []
  let myFilteredViews: FilteredView[] = []
  $: if (currentApplication?.alias !== undefined) {
    filteredViewsQuery.query<FilteredView>(
      view.class.FilteredView,
      { attachedTo: currentApplication?.alias },
      (result) => {
        myFilteredViews = result.filter((p) => includesAny(p.users, myAcc.socialIds))
        availableFilteredViews = result.filter((p) => p.sharable && !includesAny(p.users, myAcc.socialIds))

        const location = getLocation()
        if (location.query?.filterViewId) {
          const targetView = result.find((view) => view._id === location.query?.filterViewId)
          if (targetView) {
            load(targetView)
          }
        }
      }
    )
  } else {
    filteredViewsQuery.unsubscribe()
    myFilteredViews = []
    availableFilteredViews = []
  }

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

  async function switchPublicAction (object: FilteredView, originalEvent: MouseEvent | undefined): Promise<Action[]> {
    return [
      {
        icon: object.sharable ? TodoCheck : TodoUncheck,
        label: view.string.PublicView,
        action: async (ctx: any, evt: Event) => {
          await client.update(object, { sharable: !object.sharable })
        }
      }
    ]
  }

  async function copyUrlAction (filteredView: FilteredView): Promise<Action[]> {
    return [
      {
        icon: view.icon.CopyLink,
        label: view.string.CopyToClipboard,
        inline: true,
        action: async (ctx: any, evt: Event) => {
          const { protocol, hostname, port } = window.location
          const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`
          const query = filteredView.location.query || {}
          query.filterViewId = filteredView._id

          const targetUrl = locationToUrl({
            path: filteredView.location.path,
            query,
            fragment: filteredView.location.fragment ?? undefined
          })
          copyTextToClipboard(baseUrl + targetUrl)
        }
      }
    ]
  }

  async function viewAction (filteredView: FilteredView, originalEvent: MouseEvent | undefined): Promise<Action[]> {
    const copyUrl = await copyUrlAction(filteredView)
    const rename = await renameAction(filteredView, originalEvent)
    const setPublic = await switchPublicAction(filteredView, originalEvent)
    const hide = await hideAction(filteredView)

    if (filteredView.createdBy !== undefined && myAcc.socialIds.includes(filteredView.createdBy)) {
      const remove = await removeAction(filteredView)
      return [...setPublic, ...rename, ...remove, ...copyUrl]
    }
    return [...hide, ...copyUrl]
  }

  async function hideAction (object: FilteredView): Promise<Action[]> {
    return [
      {
        icon: view.icon.Archive,
        label: view.string.Hide,
        action: async (ctx: any, evt: Event) => {
          await client.update(object, { $pull: { users: { $in: myAcc.socialIds } } })
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
      const viewlet = await client.findOne<Viewlet>(view.class.Viewlet, { _id: fv.viewletId })
      setActiveViewletId(fv.viewletId, fv.location)
      if (viewlet !== undefined && fv.viewOptions !== undefined) {
        setViewOptions(viewlet, copy(fv.viewOptions))
      }
    }
    setFilters(JSON.parse(fv.filters))
  }

  const clearSelection = (): void => {
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
      const viewOptions = getViewOptions({ _id: fv.viewletId } as unknown as Viewlet, viewOptionStore)
      if (JSON.stringify(fv.viewOptions) !== JSON.stringify(viewOptions)) return false
    }
    return true
  }

  function checkSelected (
    fs: Filter[],
    loc: Location,
    filteredViews: FilteredView[] | undefined,
    viewOptionStore: Map<string, ViewOptions>
  ): void {
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
      const pushMeToFV = async (id: Ref<FilteredView>): Promise<void> => {
        if (id === undefined) return
        const filteredView = filteredViewsIdMap.get(id)
        if (filteredView) await client.update(filteredView, { $push: { users: myAcc.primarySocialId } })
      }
      const value = availableFilteredViews.map((p) => ({
        id: p._id,
        text: p.name
      }))
      const add: Action = {
        label: view.string.AddSavedView,
        icon: IconAdd,
        action: async (_, e): Promise<void> => {
          showPopup(
            SelectPopup,
            { value, searchable: true },
            getPopupPositionElement(eventToHTMLElement(e as MouseEvent), {
              v: 'top',
              h: 'right'
            }),
            pushMeToFV
          )
        }
      }
      return [add]
    } else {
      return []
    }
  }
  $: visibleFilter = myFilteredViews.find((fv) => fv._id === selectedId)
</script>

{#if shown}
  <TreeNode
    _id={'tree-saved'}
    label={view.string.FilteredViews}
    highlighted={selectedId !== undefined}
    actions={async () => await getActions(availableFilteredViews)}
    isFold
    empty={myFilteredViews.length === 0}
    visible={selectedId !== undefined}
  >
    {#each myFilteredViews as fv}
      <TreeItem
        _id={fv._id}
        title={fv.name}
        selected={selectedId === fv._id}
        on:click={async () => {
          await load(fv)
        }}
        actions={async (ov) => await viewAction(fv, ov)}
      />
    {/each}

    <svelte:fragment slot="visible">
      {#if visibleFilter}
        {@const item = visibleFilter}
        <TreeItem _id={item._id} title={item.name} selected actions={async (ov) => await viewAction(item, ov)} />
      {/if}
    </svelte:fragment>
  </TreeNode>
{/if}
