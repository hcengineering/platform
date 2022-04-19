<script lang="ts">
  import { Employee, formatName } from '@anticrm/contact'
  import { getFirstName, getLastName } from '@anticrm/contact'
  import { Button, showPopup } from '@anticrm/ui'
  import type { IntlString } from '@anticrm/platform'
  import EditMember from '../popups/EditMember.svelte'

  export let value: Employee
  export let size: 'large' | 'medium'
  export let menuItems: { title: IntlString; handler: () => void }[][]

  const firstName = getFirstName(value.name)
  const lastName = getLastName(value.name)
  const nameLabel = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
  const formattedName = formatName(value.name)

  const openPopup = () => {
    const onClose = () => closePopup()

    const closePopup = showPopup(EditMember, { member: value, menuItems, onClose })
  }
</script>

{#if value}
  <Button {size} kind="no-border" shape="circle" title={formattedName} on:click={openPopup}>
    <div slot="content" class="text-md">{nameLabel}</div>
  </Button>
{/if}
