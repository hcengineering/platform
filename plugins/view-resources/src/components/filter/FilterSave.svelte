<script lang="ts">
  import core, { Class, Doc, Ref, Space, getCurrentAccount } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { Button, EditBox, ToggleWithLabel, getCurrentResolvedLocation } from '@hcengineering/ui'
  import { ViewOptions } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { filterStore } from '../../filter'
  import view from '../../plugin'
  import { getActiveViewletId } from '../../utils'

  export let viewOptions: ViewOptions | undefined = undefined
  export let _class: Ref<Class<Doc>>

  let sharable = true

  let filterName = ''
  const client = getClient()

  async function getTargetSpace (spaceRef: string | undefined): Promise<Ref<Space>> {
    // Store the filtered view in the space it is built on
    if (spaceRef === undefined) return core.space.Workspace
    const space = await client.findOne(core.class.Space, { _id: spaceRef as Ref<Space> })
    return space?._id ?? core.space.Workspace
  }

  async function saveFilter () {
    const loc = getCurrentResolvedLocation()
    loc.fragment = undefined
    const filters = JSON.stringify($filterStore)
    await client.createDoc(view.class.FilteredView, await getTargetSpace(loc.path[3]), {
      name: filterName,
      location: loc,
      filterClass: _class,
      filters,
      attachedTo: loc.path[2] as Ref<Doc>,
      viewOptions,
      viewletId: getActiveViewletId(),
      sharable,
      users: [getCurrentAccount().uuid]
    })
  }

  const dispatch = createEventDispatcher()
</script>

<Card
  label={view.string.NewFilteredView}
  okAction={saveFilter}
  canSave={filterName.trim().length > 0}
  gap={'gapV-4'}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button focusIndex={1} icon={view.icon.Filter} size={'medium'} kind={'link-bordered'} noFocus />
    </div>
    <div class="clear-mins flex-grow">
      <EditBox
        placeholder={view.string.FilteredViewName}
        bind:value={filterName}
        kind={'large-style'}
        autoFocus
        focusIndex={1}
      />
    </div>
  </div>
  <ToggleWithLabel bind:on={sharable} label={view.string.Public} />
</Card>
