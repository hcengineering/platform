<script lang="ts">
  import { Employee, getName, Person } from '@hcengineering/contact'
  import { Avatar, personByPersonIdStore } from '@hcengineering/contact-resources'
  import { PersonId, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import task, { Project } from '@hcengineering/task'
  import { Button, Scroller } from '@hcengineering/ui'

  export let value: Ref<Project>
  export let selected: Ref<Employee>

  let space: Project | undefined = undefined

  const client = getClient()

  const query = createQuery()
  $: query.query(task.class.Project, { _id: value }, (res) => {
    space = res[0]
  })

  let employees: Employee[] = []

  function getEmployees (
    space: Project | undefined,
    personByPersonId: Map<PersonId, Person>
  ): void {
    if (space === undefined) return
    const spaceEmployees = new Set(space.members.map((pid) => personByPersonId.get(pid)).filter((p) => p !== undefined))
    employees = Array.from(spaceEmployees).sort((a, b) => getName(client.getHierarchy(), a).localeCompare(getName(client.getHierarchy(), b))) as Employee[]
  }

  $: getEmployees(space, $personByPersonIdStore)
</script>

{#if space}
  <Scroller padding={'.25rem'} gap={'gap-2'} contentDirection={'horizontal'} noFade={false}>
    {#each employees as employee}
      <Button size={'x-large'} selected={employee._id === selected} on:click={() => (selected = employee._id)}>
        <svelte:fragment slot="content">
          <Avatar person={employee} name={employee.name} size={'smaller'} />
          <span class="ml-2">{getName(client.getHierarchy(), employee)}</span>
        </svelte:fragment>
      </Button>
    {/each}
  </Scroller>
{/if}
