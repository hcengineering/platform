<script lang="ts">
  import { Ref, Space } from '@hcengineering/core'
  import { Status } from '@hcengineering/platform'
  import { Component } from '@hcengineering/ui'
  import { CreateExtensionKind, DocCreateExtension } from '../../types'
  import { DocCreateExtensionManager } from './manager'

  export let manager: DocCreateExtensionManager
  export let kind: CreateExtensionKind
  export let props: Record<string, any> = {}
  export let space: Space | undefined = undefined

  $: extensions = manager.extensions

  $: filteredExtensions = $extensions.filter((it) => it.components[kind] !== undefined)

  function getSetError (_id: Ref<DocCreateExtension>): (error: Status) => void {
    return (error: Status) => {
      manager.setErrors(_id, error)
    }
  }
</script>

{#if filteredExtensions.length > 0}
  {#each filteredExtensions as extension}
    {@const state = manager.getState(extension._id)}
    {@const setError = getSetError(extension._id)}
    {@const component = extension.components[kind]}
    {#if component}
      <Component is={component} props={{ kind, state, space, setError, ...props }} on:close={close} />
    {/if}
  {/each}
{:else}
  <slot />
{/if}
