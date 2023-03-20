<script lang="ts">
  import { Card, getClient } from '@hcengineering/presentation'
  import view from '../../plugin'
  import { EditBox, getCurrentLocation, Button } from '@hcengineering/ui'
  import preference from '@hcengineering/preference'
  import { createEventDispatcher } from 'svelte'
  import { filterStore } from '../../filter'
  import { ViewOptions } from '@hcengineering/view'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { getActiveViewletId } from '../../utils'

  export let viewOptions: ViewOptions | undefined = undefined
  export let _class: Ref<Class<Doc>>

  let filterName = ''
  const client = getClient()

  async function saveFilter () {
    const loc = getCurrentLocation()
    loc.fragment = undefined
    loc.query = undefined
    const filters = JSON.stringify($filterStore)
    await client.createDoc(view.class.FilteredView, preference.space.Preference, {
      name: filterName,
      location: loc,
      filterClass: _class,
      filters,
      attachedTo: loc.path[2] as Ref<Doc>,
      viewOptions,
      viewletId: getActiveViewletId()
    })
  }

  const dispatch = createEventDispatcher()
</script>

<Card
  label={view.string.NewFilteredView}
  okAction={saveFilter}
  canSave={filterName.length > 0}
  on:close={() => {
    dispatch('close')
  }}
>
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button focusIndex={1} icon={view.icon.Filter} size={'medium'} kind={'link-bordered'} disabled />
    </div>
    <div class="clear-mins flex-grow">
      <EditBox
        placeholder={view.string.FilteredViewName}
        bind:value={filterName}
        kind={'large-style'}
        focus
        focusIndex={1}
      />
    </div>
  </div>
</Card>
