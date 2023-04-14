<script lang="ts">
  import { Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import { Action, Location, location, navigate } from '@hcengineering/ui'
  import view, { Filter, FilteredView } from '@hcengineering/view'
  import {
    TreeItem,
    TreeNode,
    activeViewlet,
    filterStore,
    makeViewOptionsKey,
    makeViewletKey,
    setActiveViewletId,
    setFilters,
    setViewOptions,
    viewOptionStore
  } from '@hcengineering/view-resources'
  import { Application } from '@hcengineering/workbench'
  import { createEventDispatcher } from 'svelte'

  export let currentApplication: Application | undefined

  const dispatch = createEventDispatcher()
  const client = getClient()

  const filteredViewsQuery = createQuery()
  let filteredViews: FilteredView[] | undefined
  $: filteredViewsQuery.query(
    view.class.FilteredView,
    { attachedTo: currentApplication?.alias as Ref<Doc> },
    (result) => {
      filteredViews = result
    }
  )

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

  let selectedId: Ref<FilteredView> | undefined = undefined
  async function load (fv: FilteredView): Promise<void> {
    if (fv.viewletId !== undefined && fv.viewletId !== null) {
      const viewlet = await client.findOne(view.class.Viewlet, { _id: fv.viewletId })
      setActiveViewletId(fv.viewletId, fv.location)
      if (viewlet !== undefined && fv.viewOptions !== undefined) {
        setViewOptions(viewlet, fv.viewOptions)
      }
    }
    navigate(fv.location)
    setFilters(JSON.parse(fv.filters))
  }

  const clearSelection = () => {
    selectedId = undefined
    dispatch('select', false)
  }

  function checkSelected (fs: Filter[], loc: Location, filteredViews: FilteredView[] | undefined) {
    const filters = JSON.stringify(fs)
    if (loc && Array.isArray(fs) && fs.length > 0 && Array.isArray(filteredViews)) {
      for (const fv of filteredViews) {
        if (fv.location.path.join() !== loc.path.join()) continue
        if (fv.filters !== filters) continue
        const key = makeViewletKey(loc)
        if (fv.viewletId !== $activeViewlet[key]) continue
        if (fv.viewletId !== null) {
          const optionKey = makeViewOptionsKey(fv.viewletId)
          const viewOptions = $viewOptionStore.get(optionKey)
          if (JSON.stringify(fv.viewOptions) !== JSON.stringify(viewOptions)) continue
        }
        selectedId = fv._id
        dispatch('select', true)
        return
      }
      clearSelection()
    } else {
      clearSelection()
    }
  }

  $: checkSelected($filterStore, $location, filteredViews)
  $: dispatch('shown', filteredViews !== undefined && filteredViews.length > 0)
</script>

{#if filteredViews && filteredViews.length > 0}
  <TreeNode label={view.string.FilteredViews} parent>
    {#each filteredViews as fv}
      <TreeItem
        _id={fv._id}
        title={fv.name}
        selected={selectedId === fv._id}
        on:click={() => load(fv)}
        actions={() => removeAction(fv)}
      />
    {/each}
  </TreeNode>
{/if}
