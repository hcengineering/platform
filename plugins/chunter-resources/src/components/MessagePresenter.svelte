<script lang="ts">
  import { DirectMessage, Message } from '@hcengineering/chunter'
  import { getCurrentLocation, navigate } from '@hcengineering/ui'
  import { createQuery, getClient, MessageViewer } from '@hcengineering/presentation'
  import { getDmName, getSpaceLink } from '../utils'
  import chunter from '../plugin'

  export let value: Message
  const client = getClient()
  let dm: DirectMessage | undefined
  const query = createQuery()

  $: query.query(chunter.class.DirectMessage, { _id: value.space }, (result) => {
    dm = result[0]
  })

  $: link = getSpaceLink(value.space)

  function goto () {
    const loc = getCurrentLocation()
    loc.path[1] = 'chunter'
    loc.path[2] = value.space
    loc.query = undefined
    navigate(loc)
  }
</script>

{#if dm}
  {#await getDmName(client, dm) then name}
    <a class="flex-presenter" href={link} on:click={() => goto()}>
      <span class="label">{name}</span>
    </a>
    <div><MessageViewer message={value.content} /></div>
  {/await}
{/if}
