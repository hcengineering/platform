<script lang="ts">
  import core, { Ref, Space, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, Icon, TabList, getCurrentResolvedLocation, location, navigate } from '@hcengineering/ui'
  import { Viewlet } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import board from '../plugin'

  export let spaceId: Ref<Space> | undefined
  export let viewlets: WithLookup<Viewlet>[]
  export let viewlet: WithLookup<Viewlet>

  const dispatch = createEventDispatcher()

  let space: Space
  const query = createQuery()
  $: query.query(core.class.Space, { _id: spaceId }, (result) => {
    space = result[0]
  })

  function showMenu () {
    const loc = getCurrentResolvedLocation()
    loc.path[4] = space._id
    navigate(loc)
  }
  $: showMenuButton = $location.path[4] === undefined

  $: viewslist = viewlets.map((views) => {
    return {
      id: views._id,
      icon: views.$lookup?.descriptor?.icon,
      tooltip: views.$lookup?.descriptor?.label
    }
  })
</script>

<div class="ac-header full">
  {#if space}
    <div class="ac-header__wrap-description">
      <div class="ac-header__wrap-title" on:click>
        <div class="ac-header__icon"><Icon icon={board.icon.Board} size={'small'} /></div>
        <span class="ac-header__title">{space.name}</span>
      </div>
      <span class="ac-header__description">{space.description}</span>
    </div>
    {#if viewlets.length > 1}
      <TabList
        items={viewslist}
        multiselect={false}
        selected={viewlet?._id}
        kind={'regular'}
        size={'small'}
        on:select={(result) => {
          if (result.detail !== undefined) {
            const viewlet = viewlets.find((vl) => vl._id === result.detail.id)
            dispatch('change', viewlet)
          }
        }}
      />
    {/if}
    {#if showMenuButton}
      <Button label={board.string.ShowMenu} size={'small'} on:click={showMenu} />
    {/if}
  {/if}
</div>
