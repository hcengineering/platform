<script lang="ts">
  import { DocumentUpdate, Ref } from '@hcengineering/core'
  import { IntlString, getEmbeddedLabel } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import tracker, { Project, ProjectTargetPreference } from '@hcengineering/tracker'
  import {
    Button,
    ButtonWithDropdown,
    Icon,
    IconDropdown,
    Label,
    SelectPopup,
    eventToHTMLElement,
    showPopup,
    type SelectPopupValueType
  } from '@hcengineering/ui'
  import { GithubIntegrationRepository } from '@hcengineering/github'
  import { Writable } from 'svelte/store'
  import github from '../plugin'
  import { integrationRepositories } from './utils'

  export let state: Writable<Record<string, any>>
  export let okProcessing: boolean = false
  export let canSave: boolean = true
  export let okLabel: IntlString | undefined
  export let space: Project | undefined
  export let popupPlaceholder: IntlString = github.string.Repository
  export let handleOkClick: () => void
  export let preferences: ProjectTargetPreference[] = []

  $: githubProject =
    space !== undefined && getClient().getHierarchy().hasMixin(space, github.mixin.GithubProject)
      ? getClient().getHierarchy().as(space, github.mixin.GithubProject)
      : undefined

  let repository: Ref<GithubIntegrationRepository> | undefined
  let selectedRepository: GithubIntegrationRepository | undefined

  $: spacePreferences = preferences.find((it) => it.attachedTo === space?._id)
  $: if (spacePreferences !== undefined) {
    repository = spacePreferences.props?.find((it) => it.key === github.class.GithubIntegrationRepository)?.value
  }

  $: rawRepositories = Array.from($integrationRepositories.values()).filter(
    (it) => it.githubProject === githubProject?._id
  )

  const handleSelectedRepositoryIdUpdated = async (
    newRepositoryId: Ref<GithubIntegrationRepository> | null | undefined,
    components: GithubIntegrationRepository[]
  ): Promise<void> => {
    if (newRepositoryId === null || newRepositoryId === undefined) {
      selectedRepository = undefined

      return
    }
    selectedRepository = components.find((it) => it._id === newRepositoryId)
  }

  function performOK (repository: Ref<GithubIntegrationRepository> | undefined): void {
    $state.repository = repository ?? undefined
    handleOkClick()
  }

  $: void handleSelectedRepositoryIdUpdated(repository, rawRepositories)

  function getRepositoryInfo (rawComponents: GithubIntegrationRepository[]): SelectPopupValueType[] {
    return [
      ...rawComponents.map((p) => ({
        id: p._id,
        icon: github.icon.Github,
        label: getEmbeddedLabel(p.name),
        props: {
          value: p
        }
      })),
      {
        id: '#',
        label: github.string.WithoutRepository
      }
    ]
  }

  let repositories: SelectPopupValueType[] = []
  $: repositories = getRepositoryInfo(rawRepositories)

  function updateProjectPreferences (
    space: Ref<Project>,
    spacePreferences: ProjectTargetPreference | undefined,
    repository: Ref<GithubIntegrationRepository> | undefined
  ): void {
    if (spacePreferences !== undefined) {
      const data: DocumentUpdate<ProjectTargetPreference> = {
        usedOn: Date.now()
      }
      const value = (spacePreferences.props ?? []).find((it) => it.key === github.class.GithubIntegrationRepository)
      if (value === undefined) {
        data.props = [
          ...(spacePreferences.props ?? []),
          { key: github.class.GithubIntegrationRepository, value: repository }
        ]
      } else if (value.value !== repository) {
        // no value
        value.value = repository
        data.props = spacePreferences.props
      }
      void getClient().update(spacePreferences, data)
    } else {
      void getClient().createDoc(tracker.class.ProjectTargetPreference, space, {
        attachedTo: space,
        usedOn: Date.now(),
        props: [
          {
            key: github.class.GithubIntegrationRepository as string,
            value: repository
          }
        ]
      })
    }
  }

  const handleRepositoryEditorOpened = async (event: MouseEvent): Promise<void> => {
    event.stopPropagation()
    if (!canSave) {
      return
    }

    if (repository != null) {
      performOK(repository)
      return
    }

    showPopup(
      SelectPopup,
      { value: repositories, placeholder: popupPlaceholder, searchable: false },
      eventToHTMLElement(event),
      (evt) => {
        if (evt !== undefined) {
          if (evt === '#') {
            performOK(undefined)
          } else {
            repository = evt
            if (repository != null && space !== undefined) {
              updateProjectPreferences(space._id, spacePreferences, repository)
            }
            performOK(repository)
          }
        }
      }
    )
  }
</script>

{#if githubProject !== undefined && rawRepositories.length > 0}
  <ButtonWithDropdown
    kind={'primary'}
    size={'large'}
    dropdownItems={repositories}
    disabled={!canSave}
    label={okLabel}
    dropdownIcon={IconDropdown}
    loading={okProcessing}
    on:click={handleRepositoryEditorOpened}
    on:dropdown-selected={(ev) => {
      if (ev.detail != null) {
        if (ev.detail === '#') {
          performOK(undefined)
        } else {
          repository = ev.detail
          if (repository != null && space !== undefined) {
            updateProjectPreferences(space._id, spacePreferences, repository)
          }
        }
      }
    }}
  >
    <svelte:fragment slot="content">
      <div class="ml-1">
        <Label label={github.string.RepositoryIn} />
      </div>
      {#if selectedRepository !== undefined}
        <div class="flex-row-center">
          <div class="p-1">
            <Icon icon={github.icon.Github} size={'small'} />
          </div>
          {selectedRepository.name}
        </div>
      {/if}
    </svelte:fragment>
  </ButtonWithDropdown>
{:else}
  <Button
    loading={okProcessing}
    focusIndex={10001}
    disabled={!canSave}
    label={okLabel}
    kind={'primary'}
    size={'large'}
    on:click={() => {
      performOK(repository)
    }}
  />
{/if}
