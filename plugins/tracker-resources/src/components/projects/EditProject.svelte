<script lang="ts">
  import { Ref } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Project } from '@anticrm/tracker'
  import { getCurrentLocation } from '@anticrm/ui'
  import DocAttributeBar from '@anticrm/view-resources/src/components/DocAttributeBar.svelte'
  import tracker from '../../plugin'
  import Issues from '../issues/Issues.svelte'

  let project: Project | undefined

  const projectQuery = createQuery()
  $: projectQuery.query(tracker.class.Project, { _id: projectId }, (result) => {
    ;[project] = result
  })
  $: projectId = getCurrentLocation().path[3] as Ref<Project>
  $: label = project?.label
  $: currentSpace = project?.space
  $: query = { project: project?._id }
</script>

{#if project && currentSpace}
  <Issues {currentSpace} {query} {label}>
    <svelte:fragment slot="aside">
      <DocAttributeBar object={project} mixins={[]} ignoreKeys={['icon']} />
    </svelte:fragment>
  </Issues>
{/if}
