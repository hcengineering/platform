<script lang="ts">
  import { Component, ComponentExtensionId } from '@hcengineering/ui'
  import plugin from '../plugin'
  import { ComponentPointExtension } from '../types'
  import { getClient } from '../utils'

  export let extension: ComponentExtensionId
  export let props: Record<string, any> = {}

  let extensions: ComponentPointExtension[] = []

  getClient()
    .findAll<ComponentPointExtension>(plugin.class.ComponentPointExtension, {
      extension
    })
    .then((res) => {
      extensions = res
    })
</script>

{#each extensions as extension}
  <Component is={extension.component} props={{ ...extension.props, ...props }} />
{/each}
