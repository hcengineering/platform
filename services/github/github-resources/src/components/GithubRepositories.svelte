<script lang="ts">
  import { AttachedDoc, Ref, WithLookup } from '@hcengineering/core'
  import { GithubIntegration, GithubIntegrationRepository, GithubProject } from '@hcengineering/github'
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { NavLink, getClient, isAdminUser } from '@hcengineering/presentation'
  import MessageBox from '@hcengineering/presentation/src/components/MessageBox.svelte'
  import tracker, { Project } from '@hcengineering/tracker'
  import ui, {
    Action,
    Button,
    Expandable,
    Icon,
    IconColStar,
    IconMoreV,
    Label,
    Menu,
    SearchEdit,
    TimeSince,
    getEventPositionElement,
    showPopup
  } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import { Analytics } from '@hcengineering/analytics'

  import github from '../plugin'
  import ConnectProject from './ConnectProject.svelte'
  import { githubLanguageColors } from './languageColors'
  import { sendGHServiceRequest } from './utils'

  export let integration: WithLookup<GithubIntegration>
  export let projects: Project[] = []
  export let giProjects: GithubProject[] = []
  export let orphanProjects: GithubProject[] = []

  const client = getClient()

  const asRepos = (docs: AttachedDoc[]) => docs as GithubIntegrationRepository[]
  let search: string = ''

  let limit = 5

  async function disconnect (prj: GithubProject, repository: GithubIntegrationRepository): Promise<void> {
    // We need to disable repository first
    await client.update(repository, {
      enabled: false,
      githubProject: null
    })
    await client.update(prj, {
      $pull: { repositories: repository._id }
    })
    Analytics.handleEvent('github.project.disconnected', {
      project: prj.identifier,
      repository: repository._id
    })
    // // We need to delete all issues related to repository
    // const ops = client.apply('cleanup:' + repository._id)
    // const issuesQuery = await client.findAll(
    //   github.mixin.GithubIssue,
    //   {
    //     space: prj._id as Ref<Project>,
    //     repository: repository._id
    //   },
    //   { projection: { _id: 1, _class: 1 } }
    // )
    // for (const i of issuesQuery) {
    //   await ops.removeDoc(i._class, prj._id, i._id)
    // }
    // const docInfo = await client.findAll(
    //   github.class.DocSyncInfo,
    //   {
    //     space: prj._id as Ref<Project>,
    //     repository: repository._id
    //   },
    //   { projection: { _id: 1, _class: 1 } }
    // )
    // for (const i of docInfo) {
    //   await ops.removeDoc(i._class, prj._id, i._id)
    // }
    // await ops.commit()
  }

  async function onDisconnect (
    event: MouseEvent,
    prj: GithubProject,
    repository: GithubIntegrationRepository
  ): Promise<void> {
    const issuesQuery = await client.findAll(
      github.mixin.GithubIssue,
      {
        space: prj._id as Ref<Project>,
        repository: repository._id
      },
      { total: true, limit: 1 }
    )
    showPopup(MessageBox, {
      label: github.string.UnlinkRepository,
      message: github.string.UnlinkMessage,
      params: { repositoryName: repository.name, prjName: prj.name, total: issuesQuery.total },
      richMessage: true,
      action: async () => {
        await disconnect(prj, repository)
      }
    })
  }

  $: repos = asRepos(integration.$lookup?.repositories ?? [])
    .filter((it) => it.name.toLowerCase().includes(search))
    .sort((a, b) => {
      const aprj = giProjects.find((it) => it.repositories.includes(a._id))
      const bprj = giProjects.find((it) => it.repositories.includes(b._id))

      if (aprj !== undefined && bprj === undefined) {
        return -1
      }
      if (bprj !== undefined && aprj === undefined) {
        return 1
      }

      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
    })

  async function showMenu (evt: MouseEvent, prj: GithubProject, repository: GithubIntegrationRepository): Promise<void> {
    if (isAdminUser()) {
      const actions: Action[] = [
        {
          label: !repository.enabled ? github.string.Enable : github.string.Disable,
          action: async (props: any, ev: Event) => {
            void client.update(repository, { enabled: !repository.enabled })
          }
        }
      ]

      showPopup(
        Menu,
        {
          actions
        },
        getEventPositionElement(evt),
        () => {}
      )
    }
  }
</script>

<div
  style:background-color={!integration.alive ? 'var(--primary-button-disabled)' : undefined}
  style:border-radius="0.5rem"
  class="p-1"
>
  <Expandable expanded={true}>
    <svelte:fragment slot="title">
      <span class="fs-title flex-row-center flex-between flex-grow flex">
        <div class="ml-2 mr-2">
          <img class="svg-large" src={integration.name.replace('github.com', 'avatars.githubusercontent.com')} />
        </div>
        {#if integration.name.length > 0}
          {integration.name}
          {#if (integration.type ?? '') !== ''}
            ({integration.type})
          {/if}
        {:else}
          <Label label={github.string.ConnectionPending} />
        {/if}
        {#if !integration.alive}
          <Label label={github.string.Suspended} />
        {/if}
      </span>
    </svelte:fragment>
    <svelte:fragment slot="tools">
      <Button
        kind={'dangerous'}
        label={github.string.RemoveInstallation}
        on:click={() => {
          showPopup(MessageBox, {
            label: github.string.UnlinkInstallationTitle,
            message: github.string.UnlinkInstallation,
            params: {},
            richMessage: true,
            action: async () => {
              await sendGHServiceRequest('installation-remove', {
                installationId: integration.installationId,
                token: getMetadata(presentation.metadata.Token) ?? ''
              })
            }
          })
        }}
      />
    </svelte:fragment>
    <div class="flex flex-row-center flex-between m-0-5">
      <SearchEdit bind:value={search} width={'100%'} />
    </div>
    {#each repos.slice(0, limit) as repository}
      {@const prj = giProjects.find((it) => it.repositories.includes(repository._id))}
      <div
        class="repository-card flex-col m-0-5"
        class:selected={prj !== undefined}
        class:disabled={prj !== undefined && !repository.enabled}
      >
        <div class="flex flex-row-center flex-between">
          <div class="flex-row-center">
            <NavLink href={repository.htmlURL}>{repository.name}</NavLink>
            <div class="ml-2 visibility">
              {repository.visibility}
            </div>
            {#if !repository.enabled && prj !== undefined}
              <div class="ml-2 visibility">
                <Label label={github.string.Disabled} />
              </div>
            {/if}
          </div>

          <div class="flex flex-row-center">
            {#if prj !== undefined}
              <div class="mr-2">
                <Label label={github.string.LinkedWith} />
              </div>
              <ObjectPresenter _class={prj._class} objectId={prj._id} value={prj} />
              <div class="ml-2">
                <Button
                  kind={'dangerous'}
                  label={github.string.UnlinkFromProject}
                  size={'medium'}
                  on:click={(evt) => {
                    void onDisconnect(evt, prj, repository)
                  }}
                />
              </div>
              <div class="ml-2">
                <Button
                  icon={IconMoreV}
                  size={'small'}
                  on:click={(evt) => {
                    void showMenu(evt, prj, repository)
                  }}
                />
              </div>
            {:else}
              <ConnectProject {integration} {repository} {projects} {orphanProjects} />
            {/if}
          </div>
        </div>
        <div class="mt-2">
          {repository.description ?? ''}
        </div>

        <div class="flex flex-row-center mt-4">
          {#if repository.language != null}
            <div class="flex-row-center mr-4">
              <div class="lcolor-pin mr-1" style:background-color={githubLanguageColors[repository.language] ?? ''} />
              {repository.language}
            </div>
          {/if}

          <div class="flex-row-center">
            <Icon icon={IconColStar} fill={'none'} size={'small'} />
            <span class="ml-1">{repository.stargazers ?? 0}</span>
          </div>

          <div class="flex-row-center ml-4">
            <Icon icon={github.icon.Forks} size={'small'} />
            <span class="ml-1">{repository.forks ?? 0}</span>
          </div>

          <div class="flex-row-center ml-4">
            <Icon icon={tracker.icon.Issue} size={'small'} />
            <span class="ml-1">{repository.openIssues ?? 0}</span>
          </div>

          {#if repository.updatedAt !== undefined}
            <div class="flex-row-center ml-4">
              <Label label={github.string.Updated} />
              <span class="ml-2">
                <TimeSince value={repository.updatedAt} />
              </span>
            </div>
          {/if}
        </div>
      </div>
    {/each}
    {#if repos.length > limit}
      <Button
        label={ui.string.ShowMore}
        on:click={() => {
          limit = limit + 10
        }}
      />
    {/if}
  </Expandable>
</div>

<style lang="scss">
  .bordered {
    border: 1px dashed var(--theme-divider-color);
  }
  .repository-card {
    border: 1px solid var(--theme-divider-color);
    border-radius: 8px;
    padding: 1rem;
    &.selected {
      background-color: var(--theme-divider-color);
    }
    &.disabled {
      border-color: red;
    }
  }
  .visibility {
    border: 1px solid var(--theme-divider-color);
    border-radius: 2em;
    padding: 0 7px;
    height: fit-content;
  }
  .lcolor-pin {
    border-radius: 50%;
    width: 12px;
    height: 12px;
    background: var(--theme-divider-color);
  }
</style>
