<script lang="ts">
  import { Ref } from '@anticrm/core'
  import { Avatar, getClient } from '@anticrm/presentation'
  import { Icon } from '@anticrm/ui'
  import contact from '@anticrm/contact'
  import { Project, ProjectStatus, Team } from '@anticrm/tracker'
  import plugin from '../../plugin'
  import ProjectStatusSelector from './ProjectStatusSelector.svelte'

  export let value: Project
  export let space: Ref<Team>

  const client = getClient()

  async function getLeadAvatar() {
    if (!value.lead) {
      return null
    }

    const lead = await client.findOne(
      contact.class.Employee,
      {_id: value.lead}
    )

    return lead?.avatar
  }

  async function updateStatus(status: ProjectStatus) {
    await client.updateDoc(
      plugin.class.Project,
      space,
      value._id,
      {status}
    )
  }
</script>

<div class="flex-presenter" on:click={console.log}>
  <div class="icon">
    <Icon icon={plugin.icon.Project} size="small" />
  </div>
  <span class="label nowrap project-label">{value.label}</span>
  <div class="icon lead">
    {#await getLeadAvatar() then avatar}
      {#if avatar}
        <Avatar avatar={avatar} size="small"/>
      {:else}
        <Icon icon={contact.icon.Person} size="small" />
      {/if}
    {/await}
  </div>
  <div class="icon">
    <ProjectStatusSelector
      kind="icon"
      shouldShowLabel={false}
      status={value.status}
      onStatusChange={status => status !== undefined && updateStatus(status)}
    />
  </div>
</div>

<style>
  .project-label {
    width: 250px;
  }

  .lead {
    width: 35px;
  }
</style>
