<script lang="ts">
  import type { Employee } from '@anticrm/contact'
  import type { IntlString } from '@anticrm/platform'
  import { ActionIcon, IconClose, Label } from '@anticrm/ui'
  import { ContactPresenter } from '@anticrm/contact-resources'

  export let member: Employee
  export let menuItems: { title: IntlString; handler: () => void }[][]
  export let onClose: () => void
</script>

<div class="antiPopup container w-85">
  <div class="absolute pt-3 pr-3" style:top="0" style:right="0">
    <ActionIcon icon={IconClose} size={'small'} action={onClose} />
  </div>
  <div class='flex p-3'>
    <ContactPresenter value={member} />
  </div>
  {#if menuItems && menuItems.length > 0}
    {#each menuItems as menuSubgroup, i}
      {#each menuSubgroup as menuItem}
        <div
          class="menu-item pr-3 pl-3 pt-2 pb-2"
          on:click={() => {
            menuItem.handler()
            onClose()
          }}
        >
          <Label label={menuItem.title} />
        </div>
      {/each}
      {#if i + 1 < menuItems.length}
        <div class="bottom-divider ml-3 mr-3 mt-2 mb-2" />
      {/if}
    {/each}
  {/if}
</div>

<style lang="scss">
  .menu-item {
    &:hover {
      cursor: pointer;
      background-color: var(--popup-bg-hover);
    }
  }
</style>
