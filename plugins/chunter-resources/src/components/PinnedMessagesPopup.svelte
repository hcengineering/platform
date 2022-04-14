<script lang="ts">
  import chunter, { ChunterMessage } from '@anticrm/chunter'
  import contact, { Employee, EmployeeAccount, formatName } from '@anticrm/contact'
  import { Ref, Space } from '@anticrm/core'
  import { Avatar, createQuery, getClient, MessageViewer } from '@anticrm/presentation'
  import { IconClose } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import { UnpinMessage } from '../index'
  import { getTime } from '../utils'

  export let space: Ref<Space>

  const pinnedQuery = createQuery()
  let pinnedIds: Ref<ChunterMessage>[] = []
  pinnedQuery.query(
    chunter.class.Channel,
    { _id: space },
    (res) => {
      pinnedIds = res[0]?.pinned ?? []
    },
    { limit: 1 }
  )

  const messagesQuery = createQuery()
  let pinnedMessages: ChunterMessage[] = []

  $: pinnedIds &&
    messagesQuery.query(chunter.class.ChunterMessage, { _id: { $in: pinnedIds } }, (res) => {
      pinnedMessages = res
    })

  const employeeAccoutsQuery = createQuery()
  let employeeAcounts: EmployeeAccount[]

  employeeAccoutsQuery.query(contact.class.EmployeeAccount, {}, (res) => (employeeAcounts = res))

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function getAvatar (_id?: Ref<Employee>): Promise<string | undefined | null> {
    if (_id === undefined) return (await client.findOne(contact.class.Employee, { _id }))?.avatar
  }

  function getEmployee (message: ChunterMessage): EmployeeAccount | undefined {
    return employeeAcounts?.find((e) => e._id === message.createBy)
  }
</script>

<div class="antiPopup vScroll popup">
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
          on:click={async () => {
            if (pinnedIds.length === 1)
              dispatch('close')
            UnpinMessage(message)
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
    padding: 1.25rem 1.25rem 1.25rem;
    max-height: 20rem;
    color: var(--theme-caption-color);
  }

  .message {
    padding: 0.75rem 1rem 0.75rem;
    margin-bottom: 1rem;
    box-shadow: inherit;
    border-radius: inherit;
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
    font-size: 0.75rem;
  }
</style>
