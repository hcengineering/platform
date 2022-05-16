<script lang="ts">
  import { Card } from '@anticrm/board'
  import contact, { Employee } from '@anticrm/contact'
  import { createQuery, getClient } from '@anticrm/presentation'
  import board from '../../plugin'
  import MemberPresenter from './MemberPresenter.svelte'
  import { updateCardMembers } from '../../utils/CardUtils'
  import { Button, IconAdd } from '@anticrm/ui'

  export let object: Card
  export let membersHandler: (e: Event) => void
  const client = getClient()

  const getMenuItems = (member: Employee) => {
    return [
      [
        {
          title: board.string.ViewProfile,
          handler: () => console.log('TODO: implement')
        }
      ],
      [
        {
          title: board.string.RemoveFromCard,
          handler: () => {
            const newMembers = membersIds.filter((m) => m !== member._id)
            updateCardMembers(object, client, newMembers)
          }
        }
      ]
    ]
  }

  const query = createQuery()
  let members: Employee[] = []
  $: if (object.members && object.members.length > 0) {
    query.query(contact.class.Employee, { _id: { $in: object.members } }, (result) => {
      members = result
    })
  } else {
    members = []
  }
  $: membersIds = members?.map((m) => m._id) ?? []
</script>

<div class="flex-row-center flex-gap-1">
  {#each members as member}
    <MemberPresenter value={member} size="medium" menuItems={getMenuItems(member)} />
  {/each}
  {#if membersHandler !== undefined}
    <Button icon={IconAdd} shape="circle" kind="no-border" size="large" on:click={membersHandler} />
  {/if}
</div>
