<script lang="ts">
  import { Issue } from '@hcengineering/tracker'
  import { IssueStatusIcon } from '@hcengineering/tracker-resources'
  import { statusStore } from '@hcengineering/view-resources'
  import ToDoReference from '../ToDoReference.svelte'

  export let value: Issue
  export let inline: boolean = false
  export let disabled: boolean = false
  export let withoutSpace: boolean = true

  $: status = $statusStore.byId.get(value.status)
</script>

<ToDoReference label={value.identifier} on:click>
  <svelte:fragment slot="icon">
    <IssueStatusIcon size="small" value={status} space={value.space} />
  </svelte:fragment>
  <slot />
</ToDoReference>
