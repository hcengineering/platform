<script lang="ts">
  import { chunterId, DirectMessage, Message } from '@hcengineering/chunter'
  import { createQuery, getClient, MessageViewer } from '@hcengineering/presentation'
  import { NavLink } from '@hcengineering/view-resources'
  import chunter from '../plugin'
  import { getDmName } from '../utils'

  export let value: Message
  const client = getClient()
  let dm: DirectMessage | undefined
  const query = createQuery()

  $: query.query(chunter.class.DirectMessage, { _id: value.space }, (result) => {
    dm = result[0]
  })
</script>

{#if dm}
  {#await getDmName(client, dm) then name}
    <NavLink app={chunterId} space={value.space}>
      <span class="label">{name}</span>
    </NavLink>
    <div><MessageViewer message={value.content} /></div>
  {/await}
{/if}
