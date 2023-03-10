<script lang="ts">
  import chunter, { ChunterMessage } from '@hcengineering/chunter'
  import contact, { Employee, EmployeeAccount, getName } from '@hcengineering/contact'
  import { IdMap, Ref, Space, toIdMap } from '@hcengineering/core'
  import { Avatar, createQuery, MessageViewer } from '@hcengineering/presentation'
  import { IconClose } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { UnpinMessage } from '../index'
  import { getTime } from '../utils'

  export let space: Ref<Space>

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

  const employeeAccoutsQuery = createQuery()
  let employeeAcounts: IdMap<EmployeeAccount> = new Map()

  employeeAccoutsQuery.query(contact.class.EmployeeAccount, {}, (res) => (employeeAcounts = toIdMap(res)))

  const employeeQuery = createQuery()
  let employees: IdMap<Employee> = new Map()

  employeeQuery.query(contact.class.Employee, {}, (res) => (employees = toIdMap(res)))

  const dispatch = createEventDispatcher()

  function getEmployee (
    message: ChunterMessage,
    employeeAcounts: IdMap<EmployeeAccount>,
    employees: IdMap<Employee>
  ): Employee | undefined {
    const acc = employeeAcounts.get(message.createBy as Ref<EmployeeAccount>)
    if (acc) {
      return employees.get(acc.employee)
    }
  }
</script>

<div class="antiPopup vScroll popup">
  {#each pinnedMessages as message}
    {@const employee = getEmployee(message, employeeAcounts, employees)}
    <div class="message">
      <div class="header">
        <div class="avatar">
          <Avatar size={'medium'} avatar={employee?.avatar} />
        </div>
        <span class="name">
          {employee ? getName(employee) : ''}
        </span>
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
      <span class="time">{getTime(message.createOn)}</span>
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
