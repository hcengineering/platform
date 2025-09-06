<script lang="ts">
  import { Component, ComponentExtensionId } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import { ComponentPointExtension } from '../../types'
  import { getClient } from '../../utils'
  import { getCurrentAccount, hasAccountRole } from '@hcengineering/core'

  export let extension: ComponentExtensionId
  export let props: Record<string, any> = {}

  const currentAccount = getCurrentAccount()
  let extensions: ComponentPointExtension[] = []

  void getClient()
    .findAll<ComponentPointExtension>(plugin.class.ComponentPointExtension, {
    extension
  })
    .then((res) => {
      extensions = res.filter((it) => it.accessLevel === undefined || hasAccountRole(currentAccount, it.accessLevel))
    })
</script>

{#each extensions as extension}
  <Component is={extension.component} showLoading={false} props={{ ...extension.props, ...props }} on:open on:close />
{/each}
