<script lang="ts">
  import { Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import { Action, navigate } from '@hcengineering/ui'
  import view, { FilteredView } from '@hcengineering/view'
  import { filterStore, setActiveViewletId, setViewOptions, TreeNode, TreeItem } from '@hcengineering/view-resources'
  import { Application } from '@hcengineering/workbench'

  export let currentApplication: Application | undefined

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

  async function load (fv: FilteredView): Promise<void> {
    if (fv.viewletId !== undefined && fv.viewletId !== null) {
      const viewlet = await client.findOne(view.class.Viewlet, { _id: fv.viewletId })
      setActiveViewletId(fv.viewletId, fv.location)
      if (viewlet !== undefined && fv.viewOptions !== undefined) {
        setViewOptions(viewlet, fv.viewOptions)
      }
    }
    navigate(fv.location)
    $filterStore = JSON.parse(fv.filters)
  }
</script>

{#if filteredViews && filteredViews.length > 0}
  <TreeNode label={view.string.FilteredViews}>
    {#each filteredViews as fv}
      <TreeItem _id={fv._id} title={fv.name} on:click={() => load(fv)} actions={() => removeAction(fv)} />
    {/each}
  </TreeNode>
{/if}
