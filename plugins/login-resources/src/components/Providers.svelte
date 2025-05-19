<script lang="ts">
  import { concatLink, type ProviderInfo } from '@hcengineering/core'
  import { getMetadata } from '@hcengineering/platform'
  import { AnySvelteComponent, Button, Grid, deviceOptionsStore, getCurrentLocation } from '@hcengineering/ui'
  import { onMount } from 'svelte'
  import login from '../plugin'
  import { getProviders } from '../utils'
  import Github from './providers/Github.svelte'
  import Google from './providers/Google.svelte'
  import OpenId from './providers/OpenId.svelte'

  interface Provider {
    name: string
    component: AnySvelteComponent
    displayName: null
  }

  const providers: Provider[] = [
    {
      name: 'google',
      component: Google,
      displayName: null
    },
    {
      name: 'github',
      component: Github,
      displayName: null
    },
    {
      name: 'openid',
      component: OpenId,
      displayName: null
    }
  ]

  let enabledProviders: Provider[] = []

  onMount(() => {
    void getProviders().then((res: ProviderInfo[]) => {
      enabledProviders = providers
        .map((provider) => {
          const match = res.find((r) => r.name === provider.name)
          if (!match) return null
          return {
            ...provider,
            displayName: match.displayName
          }
        })
        .filter((p): p is Provider & { displayName: string } => p !== null)
    })
  })

  function getColumnsCount (providersCount: number): number {
    return providersCount % 2 === 0 ? 2 : 1
  }

  const location = getCurrentLocation()

  function getLink (provider: Provider): string {
    const inviteId = location.query?.inviteId
    const autoJoin = location.query?.autoJoin !== undefined
    const navigateUrl = location.query?.navigateUrl
    const accountsUrl = getMetadata(login.metadata.AccountsUrl) ?? ''
    let path = `/auth/${provider.name}`
    if (inviteId != null) {
      path += `?inviteId=${inviteId}`
      if (autoJoin) {
        path += '&autoJoin'
      }
      if (navigateUrl != null) {
        path += `&navigateUrl=${navigateUrl}`
      }
    }

    return concatLink(accountsUrl, path)
  }
</script>

{#if !$deviceOptionsStore.isMobile}
  <div class="container">
    <Grid column={getColumnsCount(enabledProviders.length)} columnGap={1} rowGap={1} alignItems={'center'}>
      {#each enabledProviders as provider}
        <a href={getLink(provider)}>
          <Button kind={'contrast'} shape={'round2'} size={'x-large'} width="100%" stopPropagation={false}>
            <svelte:fragment slot="content">
              <svelte:component this={provider.component} displayName={provider.displayName} />
            </svelte:fragment>
          </Button>
        </a>
      {/each}
    </Grid>
  </div>
{/if}

<style lang="scss">
  .container {
    padding-top: 1rem;
  }
</style>
