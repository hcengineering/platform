<script lang="ts">
  import { Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { Project } from '@anticrm/tracker'
  import { EditBox, getCurrentLocation } from '@anticrm/ui'
  import { DocAttributeBar } from '@anticrm/view-resources'
  import Issues from '../issues/Issues.svelte'

  import tracker from '../../plugin'

  let object: Project | undefined
  $: project = getCurrentLocation().path[3] as Ref<Project>

  const client = getClient()
  const projectQuery = createQuery()
  $: projectQuery.query(tracker.class.Project, { _id: project }, (result) => {
    ;[object] = result
  })

  async function change (field: string, value: any) {
    if (object) {
      await client.update(object, { [field]: value })
    }
  }
</script>

{#if object}
  <Issues currentSpace={object.space} query={{ project }} label={object.label}>
    <svelte:fragment slot="aside">
      <div class="flex-row p-4">
        <div class="fs-title text-xl">
          <EditBox bind:value={object.label} maxWidth="39rem" on:change={() => change('label', object?.label)} />
        </div>
        <div class="mt-2">
          <StyledTextBox
            alwaysEdit={true}
            showButtons={false}
            placeholder={tracker.string.Description}
            content={object.description ?? ''}
            on:value={(evt) => change('description', evt.detail)}
          />
        </div>
        <DocAttributeBar {object} mixins={[]} ignoreKeys={['icon', 'label', 'description']} />
      </div>
    </svelte:fragment>
  </Issues>
{/if}
