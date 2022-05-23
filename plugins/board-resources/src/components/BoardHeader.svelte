<script lang="ts">
  import core, { Ref, Space, WithLookup } from '@anticrm/core'
  import { Button, getCurrentLocation, navigate, location, Tooltip, Icon } from '@anticrm/ui'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Header, classIcon } from '@anticrm/chunter-resources'
  import border from '../plugin'
  import { Viewlet } from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'

  export let spaceId: Ref<Space> | undefined
  export let viewlets: WithLookup<Viewlet>[]
  export let viewlet: WithLookup<Viewlet>

  const dispatch = createEventDispatcher()

  let space: Space
  const query = createQuery()
  $: query.query(core.class.Space, { _id: spaceId }, (result) => {
    space = result[0]
  })

  const client = getClient()

  function showMenu () {
    const loc = getCurrentLocation()
    loc.path[3] = space._id
    navigate(loc)
  }
  $: showMenuButton = $location.path[3] === undefined
</script>

<div class="ac-header divide full">
  {#if space}
    <Header icon={classIcon(client, space._class)} label={space.name} description={space.description} />
    {#if viewlets.length > 1}
      <div class="flex">
        {#each viewlets as v, i}
          <Tooltip label={v.$lookup?.descriptor?.label} direction={'top'}>
            <button
              class="ac-header__icon-button"
              class:selected={viewlet?._id === v._id}
              on:click={() => {
                dispatch('change', v)
              }}
            >
              {#if v.$lookup?.descriptor?.icon}
                <Icon icon={v.$lookup?.descriptor?.icon} size={'small'} />
              {/if}
            </button>
          </Tooltip>
        {/each}
      </div>
    {/if}
    {#if showMenuButton}
      <Button label={border.string.ShowMenu} on:click={showMenu} />
    {/if}
  {/if}
</div>
