<script lang="ts">
  import { getClient } from '@anticrm/presentation'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { Project } from '@anticrm/tracker'
  import { Button, EditBox, Icon, showPopup } from '@anticrm/ui'
  import { DocAttributeBar } from '@anticrm/view-resources'
  import tracker from '../../plugin'
  import IssuesView from '../issues/IssuesView.svelte'
  import ProjectPopup from './ProjectPopup.svelte'

  export let project: Project

  const client = getClient()

  async function change (field: string, value: any) {
    await client.update(project, { [field]: value })
  }
  function selectProject (evt: MouseEvent): void {
    showPopup(ProjectPopup, { _class: tracker.class.Project }, evt.target as HTMLElement, (value) => {
      if (value != null) {
        project = value
      }
    })
  }
</script>

<IssuesView query={{ project: project._id, space: project.space }} label={project.label}>
  <svelte:fragment slot="label_selector">
    <Button size={'small'} kind={'link'} on:click={selectProject}>
      <svelte:fragment slot="content">
        <div class="ac-header__icon"><Icon icon={tracker.icon.Issues} size={'small'} /></div>
        <span class="ac-header__title">{project.label}</span>
      </svelte:fragment>
    </Button>
  </svelte:fragment>
  <svelte:fragment slot="aside">
    <div class="flex-row p-4 w-60 left-divider">
      <div class="fs-title text-xl">
        <EditBox bind:value={project.label} maxWidth="39rem" on:change={() => change('label', project.label)} />
      </div>
      <div class="mt-2">
        <StyledTextBox
          alwaysEdit={true}
          showButtons={false}
          placeholder={tracker.string.Description}
          content={project.description ?? ''}
          on:value={(evt) => change('description', evt.detail)}
        />
      </div>
      <DocAttributeBar object={project} mixins={[]} ignoreKeys={['icon', 'label', 'description']} />
    </div>
  </svelte:fragment>
</IssuesView>
