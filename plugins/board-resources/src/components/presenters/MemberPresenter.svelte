<script lang="ts">
  import { Employee, formatName } from '@anticrm/contact'
  import { getFirstName, getLastName } from '@anticrm/contact'
  import { Button, showPopup } from '@anticrm/ui'
  import type { IntlString } from '@anticrm/platform'
  import EditMember from '../popups/EditMember.svelte'
  import { getPopupAlignment } from '../../utils/PopupUtils'

  export let value: Employee
  export let size: 'large' | 'medium'
  export let menuItems: { title: IntlString; handler: () => void }[][]

  const openPopup = (e: Event) => {
    const onClose = () => closePopup()

    const closePopup = showPopup(EditMember, { member: value, menuItems, onClose }, getPopupAlignment(e))
  }

  $: firstName = getFirstName(value.name)
  $: lastName = getLastName(value.name)
  $: nameLabel = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
  $: formattedName = formatName(value.name)
</script>

{#if value}
  <Button {size} kind="no-border" shape="circle" title={formattedName} on:click={openPopup}>
    <div slot="content" class="text-md">{nameLabel}</div>
  </Button>
{/if}
