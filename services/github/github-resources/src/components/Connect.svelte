<!--
//
// Copyright © 2023 Hardcore Engineering Inc.
//GithubIntegrationsGithubIntegrations
-->
<script lang="ts">
  import GithubIntegrations from './GithubIntegerations.svelte'

  import GithubPersonProfile from './GithubPersonProfile.svelte'

  import { Analytics } from '@hcengineering/analytics'
  import { WithLookup, getCurrentAccount } from '@hcengineering/core'
  import { GithubAuthentication, GithubIntegration } from '@hcengineering/github'
  import { getEmbeddedLabel, getMetadata, translate } from '@hcengineering/platform'
  import presentation, { Card, HTMLViewer, NavLink, createQuery, getClient } from '@hcengineering/presentation'
  import { Integration } from '@hcengineering/setting'
  import tracker, { Project } from '@hcengineering/tracker'
  import ui, { Button, Label, Loading, TabItem, TabList, location, ticker } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import github from '../plugin'
  import { onAuthorize } from './utils'
  import { clientId } from '@hcengineering/client'

  export let integration: Integration

  const dispatch = createEventDispatcher()

  const query = createQuery()
  const authQuery = createQuery()
  const projectsQuery = createQuery()

  let loading = true
  let integrations: WithLookup<GithubIntegration>[] = []
  let auth: GithubAuthentication | undefined
  let projects: Project[] = []

  query.query(
    github.class.GithubIntegration,
    {},
    (res) => {
      integrations = res
      loading = false
    },
    {
      lookup: {
        _id: {
          repositories: github.class.GithubIntegrationRepository
        }
      }
    }
  )

  authQuery.query(github.class.GithubAuthentication, {}, (res) => {
    auth = res.find((it) => it.login !== '')
  })

  projectsQuery.query(tracker.class.Project, {}, (res) => {
    projects = res
  })

  function save (): void {
    void getClient().diffUpdate(integration, {
      value: auth?.login ?? ''
    })
    dispatch('close', { value: auth?.login ?? '-' })
  }
  function onConnect (): void {
    const state = btoa(
      JSON.stringify({
        accountId: getCurrentAccount().primarySocialId,
        op: 'installation',
        workspace: $location.path[1],
        token: getMetadata(presentation.metadata.Token)
      })
    )
    Analytics.handleEvent('Install github app clicked')
    const githubApp = getMetadata(github.metadata.GithubApplication) ?? ''
    window.open(`https://github.com/apps/${githubApp}/installations/new?state=${state}`)
  }

  const tabs: TabItem[] = [
    {
      id: 'personal',
      labelIntl: getEmbeddedLabel('Your Github account')
    },
    {
      id: 'installations',
      labelIntl: getEmbeddedLabel('Github Repositories')
    }
  ]
  let selectedTab = tabs[0].id

  $: loading = $ticker - (auth?.authRequestTime ?? 0) < 5000
</script>

<Card
  label={github.string.GithubDesc}
  okAction={save}
  canSave={true}
  okLabel={presentation.string.Ok}
  on:close={() => dispatch('close')}
  on:changeContent
>
  {#if loading}
    <Loading />
  {:else}
    <TabList
      items={tabs}
      bind:selected={selectedTab}
      kind={'plain'}
      on:select={(result) => {
        selectedTab = result.detail.id
      }}
    />
    <div class="flex flex-grow mt-4">
      {#if selectedTab === 'personal'}
        <div class="flex-row flex-grow p-3">
          {#if auth}
            <GithubPersonProfile {auth} />
          {:else}
            <Label label={github.string.PleaseAuthorizeAs} params={{ title: getMetadata(ui.metadata.PlatformTitle) }} />
          {/if}
        </div>
      {:else if selectedTab === 'installations'}
        <div class="flex flex-col flex-grow">
          <GithubIntegrations {integrations} {projects}></GithubIntegrations>
          <div>
            {#if integrations.length === 0}
              <div class="flex-grow flex-col">
                <div class="">
                  {#await translate(github.string.NoIntegrationsConfigured, { appName: getMetadata(github.metadata.GithubApplication), title: getMetadata(ui.metadata.PlatformTitle) }) then msg}
                    <HTMLViewer value={msg} />
                  {/await}
                  <div class="underline">
                    <NavLink href={'https://github.com/settings/installations/'} noUnderline={false}>
                      <b><Label label={github.string.Uninstall} /></b>
                    </NavLink>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}
  <svelte:fragment slot="footer">
    {#if selectedTab === 'personal'}
      {#if auth !== undefined && $ticker - (auth?.authRequestTime ?? 0) > 0 && auth.login === ''}
        <div class="fs-title" style:color={'red'}>
          <Label label={github.string.PleaseRetry} />
        </div>
      {/if}
      <Button
        label={auth !== undefined ? github.string.ReAuthorize : github.string.Authorize}
        labelParams={{ title: getMetadata(ui.metadata.PlatformTitle) }}
        {loading}
        on:click={() => onAuthorize()}
        size={'large'}
        kind={'primary'}
      />
    {:else if selectedTab === 'installations'}
      <Button
        label={integrations.length === 0 ? github.string.InstallApp : github.string.Configure}
        labelParams={{ title: getMetadata(ui.metadata.PlatformTitle) }}
        on:click={onConnect}
        size={'large'}
        kind={'primary'}
      />
    {/if}
  </svelte:fragment>
</Card>

<style lang="scss">
  .bordered {
    border: 1px dashed var(--theme-divider-color);
  }
</style>
