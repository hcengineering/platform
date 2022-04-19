<script lang="ts">
  import { Employee, formatName } from '@anticrm/contact'
  import { getFirstName, getLastName } from '@anticrm/contact'
  import type { IntlString } from '@anticrm/platform'
  import { ActionIcon, IconClose, Label } from '@anticrm/ui'

  export let member: Employee
  export let menuItems: { title: IntlString; handler: () => void }[][]
  export let onClose: () => void

  const firstName = getFirstName(member.name)
  const lastName = getLastName(member.name)
  const nameLabel = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
  const formattedName = formatName(member.name)
</script>

<div class="antiPopup container pb-4 w-85">
  <div class="close-icon">
    <ActionIcon icon={IconClose} size={'small'} action={onClose} />
  </div>
  <div class="flex top p-4">
    <div class="avatar flex-center">
      <span class="name-label fs-bold">{nameLabel}</span>
    </div>
    <div class="fs-title mt-4 ml-4">
      {formattedName}
    </div>
  </div>
  {#if menuItems && menuItems.length > 0}
    {#each menuItems as menuSubgroup, i}
      {#each menuSubgroup as menuItem}
        <div
          class="menu-item"
          on:click={() => {
            menuItem.handler()
            onClose()
          }}
        >
          <Label label={menuItem.title} />
        </div>
      {/each}
      {#if i + 1 < menuItems.length}
        <div class="divisor" />
      {/if}
    {/each}
  {/if}
</div>

<style lang="scss">
  .avatar {
    width: 6rem;
    height: 6rem;
    background-color: var(--popup-bg-hover);
    border: 1px solid var(--caption-color);
    border-radius: 3rem;
  }

  .name-label {
    font-size: 2rem;
    color: var(--caption-color);
  }

  .top {
    background-image: linear-gradient(to bottom, var(--popup-bg-hover) 0%, var(--popup-bg-hover) 100%);
    background-repeat: no-repeat;
    background-size: 100% 5rem;
  }

  .menu-item {
    padding: 0.5rem 1rem;

    &:hover {
      cursor: pointer;
      background-color: var(--popup-bg-hover);
    }
  }

  .divisor {
    margin: 0.5rem 1rem;
    border-bottom: 1px solid var(--divider-color);
  }

  .close-icon {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
  }
</style>
