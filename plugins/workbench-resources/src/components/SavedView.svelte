<script lang="ts">
  import { Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import { Action, navigate, getCurrentLocation, location } from '@hcengineering/ui'
  import view, { FilteredView } from '@hcengineering/view'
  import {
    filterStore,
    getFilterKey,
    setActiveViewletId,
    setViewOptions,
    TreeItem,
    TreeNode
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
  let selectedFW: FilteredView[] | undefined = undefined
  async function load (fv: FilteredView): Promise<void> {
    if (fv.viewletId !== undefined && fv.viewletId !== null) {
      const viewlet = await client.findOne(view.class.Viewlet, { _id: fv.viewletId })
      setActiveViewletId(fv.viewletId, fv.location)
      if (viewlet !== undefined && fv.viewOptions !== undefined) {
        setViewOptions(viewlet, fv.viewOptions)
      }
    }
    if (fv.filterClass !== undefined) {
      const key = getFilterKey(fv.filterClass)
      const filters = JSON.parse(fv.filters)
      localStorage.setItem(key, JSON.stringify(filters))
    }
    navigate(fv.location)
    $filterStore = JSON.parse(fv.filters)
  }

  let oldLocation: string = ''
  $: loc = $location
  const clearSelection = () => {
    selectedId = selectedFW = undefined
    oldLocation = getCurrentLocation().path.join()
    dispatch('select', false)
  }

  $: fs = $filterStore
  $: if (loc && Array.isArray(fs) && fs.length > 0 && Array.isArray(filteredViews)) {
    const filters = JSON.stringify(fs)
    selectedFW = filteredViews.filter((fv) => fv.filters === filters)
    if (selectedFW.length > 0 && selectedFW[0].location.path.join() === loc.path.join()) {
      selectedId = selectedFW[0]._id
      oldLocation = selectedFW[0].location.path.join()
      dispatch('select', true)
    } else clearSelection()
  } else clearSelection()
  $: dispatch('shown', filteredViews !== undefined && filteredViews.length > 0)
</script>

{#if filteredViews && filteredViews.length > 0}
  <TreeNode icon={view.icon.Filter} label={view.string.FilteredViews}>
    {#each filteredViews as fv}
      <TreeItem
        _id={fv._id}
        title={fv.name}
        indent={'ml-2'}
        selected={selectedId === fv._id}
        on:click={() => load(fv)}
        actions={() => removeAction(fv)}
      />
    {/each}
  </TreeNode>
{/if}
