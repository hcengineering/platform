<script lang="ts">
  import { AnySvelteComponent, Button, Grid, getCurrentLocation } from '@hcengineering/ui'
  import { onMount } from 'svelte'
  import { getProviders, loginWithProvider } from '../utils'
  import Github from './providers/Github.svelte'
  import Google from './providers/Google.svelte'

  interface Provider {
    name: string
    component: AnySvelteComponent
  }

  const providers: Provider[] = [
    {
      name: 'google',
      component: Google
    },
    {
      name: 'github',
      component: Github
    }
  ]

  let enabledProviders: Provider[] = []

  onMount(() => {
    void getProviders().then((res) => {
      enabledProviders = providers.filter((provider) => res.includes(provider.name))
    })
  })

  function getColumnsCount (providersCount: number): number {
    return providersCount % 2 === 0 ? 2 : 1
  }

  const location = getCurrentLocation()
</script>

<div class="container">
  <Grid column={getColumnsCount(enabledProviders.length)} columnGap={1} rowGap={1} alignItems={'center'}>
    {#each enabledProviders as provider}
      <Button
        kind={'contrast'}
        shape={'round2'}
        size={'x-large'}
        width="100%"
        on:click={() => loginWithProvider(provider.name, location.query?.inviteId)}
      >
        <svelte:fragment slot="content">
          <svelte:component this={provider.component} />
        </svelte:fragment>
      </Button>
    {/each}
  </Grid>
</div>

<style lang="scss">
  .container {
    padding-top: 1rem;
  }
</style>
