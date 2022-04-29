<script lang="ts">
  import core, { Ref, Space } from '@anticrm/core'
  import { Button, getCurrentLocation, navigate } from '@anticrm/ui'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Header, classIcon } from '@anticrm/chunter-resources'
  import border from '../plugin'

  export let spaceId: Ref<Space> | undefined

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
</script>

<div class="ac-header divide full">
  {#if space}
    <Header icon={classIcon(client, space._class)} label={space.name} description={space.description} />
    <Button label={border.string.ShowMenu} on:click={showMenu} />
  {/if}
</div>
