<script lang="ts">
  import type { Employee } from '@anticrm/contact'
  import { getFirstName, getLastName } from '@anticrm/contact'
  import { ContactPresenter } from '@anticrm/contact-resources'
  import { CircleButton, showPopup } from '@anticrm/ui'

  export let value: Employee
  export let size: 'large' | 'medium'
  const firstName = getFirstName(value.name)
  const lastName = getLastName(value.name)
  const nameLabel = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
</script>

{#if value}
  <CircleButton
    {size}
    on:click={() => {
      showPopup(ContactPresenter, { value }) // TODO: show proper popup
    }}
  >
    <div slot="content" class="text-md">{nameLabel}</div>
  </CircleButton>
{/if}
