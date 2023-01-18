<script lang="ts">
  import { Card, getClient } from '@hcengineering/presentation'
  import view from '../../../../view/'
  import { EditBox, getCurrentLocation } from '@hcengineering/ui'
  import core from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'
  import { filterStore } from '../../filter'

  let filterName = ''
  const client = getClient()

  function getFilteredViewData () {
    const loc = getCurrentLocation()
    loc.fragment = undefined
    loc.query = undefined
    const filters = JSON.stringify($filterStore)
    return {
      name: filterName,
      location: loc,
      filters,
      attachedTo: loc.path[2]
    }
  }

  async function saveFilter () {
    await client.createDoc(view.class.FilteredView, core.space.Space, getFilteredViewData())
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
  <div class="flex-row-center">
    <div class="flex-grow flex-col">
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
