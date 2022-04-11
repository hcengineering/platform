<script lang="ts">
  import { ChunterMessage } from '@anticrm/chunter'
  import contact, { Employee, EmployeeAccount, formatName } from '@anticrm/contact'
  import { Ref } from '@anticrm/core'
  import { Avatar, getClient, MessageViewer } from '@anticrm/presentation'
  import { IconClose } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import { getTime } from '../utils'

  export let pinnedMessages: ChunterMessage[]
  export let employeeAcounts: EmployeeAccount[]

  const client = getClient()
  const dispatch = createEventDispatcher()

  function getAvatar (id?: Ref<Employee>): string | null {
    let avatar: string | null = null
    client.findOne<Employee>(contact.class.Employee, { _id: id }).then((e) => (avatar = e?.avatar ?? null))
    return avatar
  }

  function getEmployee (message: ChunterMessage): EmployeeAccount | undefined {
    return employeeAcounts?.find((e) => e._id === message.createBy)
  }
</script>

<div class="vScroll popup">
  {#each pinnedMessages as message}
    <div class="message">
      <div class="header">
        {#await getEmployee(message) then employeeAccount}
          {#await getAvatar(employeeAccount?.employee) then avatar}
            <div class="avatar">
              <Avatar size={'medium'} {avatar} />
            </div>
          {/await}
          <span class="name">
            {formatName(employeeAccount?.name ?? '')}
          </span>
        {/await}
        <div
          class="cross"
          on:click={() => {
            dispatch('close', { message: message })
          }}
        >
          <IconClose size="small" />
        </div>
      </div>
      <MessageViewer message={message.content} />
      <span class="time">{getTime(message.createOn)}</span>
    </div>
  {/each}
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    padding: 1.25rem 1.25rem 1.25rem;
    width: 300px;
    max-width: 300px;
    max-height: 300px;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-hovered);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 0.75rem;
    box-shadow: 0px 1.25rem 3.75rem rgba(0, 0, 0, 0.6);
  }

  .message {
    padding: 0.75rem 1rem 0.75rem;
    margin-bottom: 1rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-hovered);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 0.75rem;
    box-shadow: 0px 1.25rem 3.75rem rgba(0, 0, 0, 0.6);
  }

  .header {
    display: flex;
    flex-direction: row;
    align-items: center;

    .name {
      font-weight: 500;
      margin-left: 1rem;
      flex-grow: 2;
    }

    .cross {
      opacity: 0.4;
      cursor: pointer;
      &:hover {
        opacity: 1;
      }
    }
  }
  .time {
    color: var(--theme-caption-color);
    font-size: 0.75rem;
  }
</style>
