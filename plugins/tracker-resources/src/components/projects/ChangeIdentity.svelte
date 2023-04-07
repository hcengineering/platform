<script lang="ts">
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { Project } from '@hcengineering/tracker'
  import EditBox from '@hcengineering/ui/src/components/EditBox.svelte'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'

  export let project: Project

  let identifier = project.identifier

  const dispatch = createEventDispatcher()

  function save () {
    dispatch('close', identifier)
  }

  let projects: Set<string> = new Set()

  $: getClient()
    .findAll(tracker.class.Project, {})
    .then((pr) => {
      projects = new Set(pr.map((p) => p.identifier))
    })
</script>

<Card
  label={projects.has(identifier) ? tracker.string.IdentifierExists : tracker.string.Identifier}
  okLabel={presentation.string.Save}
  okAction={save}
  canSave={identifier !== project.identifier && !projects.has(identifier)}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="float-left-box">
    <div class="float-left p-2">
      <EditBox bind:value={identifier} />
    </div>
  </div>
</Card>
