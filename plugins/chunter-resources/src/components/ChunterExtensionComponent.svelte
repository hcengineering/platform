<script lang="ts">
  import { Doc } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { ChunterExtension, ChunterExtensionPoint } from '@hcengineering/chunter'
  import { Component } from '@hcengineering/ui'

  import chunter from '../plugin'

  export let object: Doc
  export let point: ChunterExtensionPoint

  let extensions: ChunterExtension[] = []

  $: extensions = getClient().getModel().findAllSync(chunter.class.ChunterExtension, { ofClass: object._class, point })
</script>

{#each extensions as extension}
  <Component is={extension.component} props={{ object }} />
{/each}
