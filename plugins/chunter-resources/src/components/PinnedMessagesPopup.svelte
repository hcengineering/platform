<script lang="ts">
  import chunter, { ChunterMessage } from '@hcengineering/chunter'
  import { Person, PersonAccount, getName } from '@hcengineering/contact'
  import { Avatar, personAccountByIdStore, personByIdStore } from '@hcengineering/contact-resources'
  import { IdMap, Ref, Space } from '@hcengineering/core'
  import { MessageViewer, createQuery, getClient } from '@hcengineering/presentation'
  import { IconClose } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { UnpinMessage } from '../index'
  import { getTime } from '../utils'

  export let space: Ref<Space>

  const client = getClient()

  const pinnedQuery = createQuery()
  let pinnedIds: Ref<ChunterMessage>[] = []
  pinnedQuery.query(
    chunter.class.ChunterSpace,
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

  const dispatch = createEventDispatcher()

  function getEmployee (
    message: ChunterMessage,
    employeeAccounts: IdMap<PersonAccount>,
    employees: IdMap<Person>
  ): Person | undefined {
    const acc = employeeAccounts.get(message.createBy as Ref<PersonAccount>)
    if (acc) {
      return employees.get(acc.person)
    }
  }
</script>

<div class="antiPopup vScroll popup">
  {#each pinnedMessages as message}
    {@const employee = getEmployee(message, $personAccountByIdStore, $personByIdStore)}
    <div class="message">
      <div class="header">
        <div class="avatar">
          <Avatar size={'medium'} avatar={employee?.avatar} name={employee?.name} />
        </div>
        <span class="name">
          {employee ? getName(client.getHierarchy(), employee) : ''}
        </span>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="cross"
          on:click={async () => {
            if (pinnedIds.length === 1) dispatch('close')
            UnpinMessage(message)
          }}
        >
          <IconClose size="small" />
        </div>
      </div>
      <MessageViewer message={message.content} />
      <span class="time">{getTime(message.createdOn ?? 0)}</span>
    </div>
  {/each}
</div>

<style lang="scss">
  .popup {
    padding: 1.25rem 1.25rem 1.25rem;
    max-height: 20rem;
    color: var(--caption-color);
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
