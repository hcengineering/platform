<script lang="ts">
  import { Class, Doc, Ref, getCurrentAccount } from '@hcengineering/core'
  import preference from '@hcengineering/preference'
  import { Card, getClient } from '@hcengineering/presentation'
  import { Button, EditBox, ToggleWithLabel, getCurrentResolvedLocation } from '@hcengineering/ui'
  import { ViewOptions } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { filterStore } from '../../filter'
  import view from '../../plugin'
  import { getActiveViewletId } from '../../utils'

  export let viewOptions: ViewOptions | undefined = undefined
  export let _class: Ref<Class<Doc>>

  const me = getCurrentAccount()._id
  let sharable = true

  let filterName = ''
  const client = getClient()

  async function saveFilter () {
    const loc = getCurrentResolvedLocation()
    loc.fragment = undefined
    const filters = JSON.stringify($filterStore)
    await client.createDoc(view.class.FilteredView, preference.space.Preference, {
      name: filterName,
      location: loc,
      filterClass: _class,
      filters,
      attachedTo: loc.path[2] as Ref<Doc>,
      viewOptions,
      viewletId: getActiveViewletId(),
      sharable,
      users: [me]
    })
  }

  const dispatch = createEventDispatcher()
</script>

<Card
  label={view.string.NewFilteredView}
  okAction={saveFilter}
  canSave={filterName.length > 0}
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
