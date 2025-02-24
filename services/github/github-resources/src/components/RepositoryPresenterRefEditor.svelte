<!--
//
// Copyright © 2023 Hardcore Engineering Inc.
//
-->
<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import { IntlString, getEmbeddedLabel } from '@hcengineering/platform'
  import {
    Button,
    ButtonKind,
    ButtonSize,
    Icon,
    IconChevronDown,
    LabelAndProps,
    SelectPopup,
    SelectPopupValueType,
    eventToHTMLElement,
    showPopup
  } from '@hcengineering/ui'
  import { HyperlinkEditor } from '@hcengineering/view-resources'
  import { GithubIntegrationRepository, GithubProject } from '@hcengineering/github'
  import github from '../plugin'
  import { integrationRepositories } from './utils'

  export let value: Ref<GithubIntegrationRepository> | undefined = undefined
  export let space: Ref<GithubProject>
  export let kind: ButtonKind | undefined = undefined
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'
  export let onChange: (value: Ref<GithubIntegrationRepository> | undefined) => void
  export let disabled: boolean
  export let popupPlaceholder: IntlString = github.string.Repository
  export let focusIndex: number | undefined = undefined
  export let showTooltip: LabelAndProps | undefined = undefined
  export let label: IntlString = github.string.AssignRepository
  export let showIcon: boolean = false

  $: repository = $integrationRepositories.get(value)

  let selectedRepository: GithubIntegrationRepository | undefined

  $: rawComponents = Array.from($integrationRepositories.values()).filter((it) => it.githubProject === space)

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

  $: void handleSelectedRepositoryIdUpdated(value, rawComponents)

  function getRepositoryInfo (
    rawComponents: GithubIntegrationRepository[],
    sp: GithubIntegrationRepository | undefined
  ): SelectPopupValueType[] {
    return [
      ...rawComponents.map((p) => ({
        id: p._id,
        icon: github.icon.Github,
        label: getEmbeddedLabel(p.name),
        props: {
          value: p
        }
      }))
    ]
  }

  let components: SelectPopupValueType[] = []
  $: components = getRepositoryInfo(rawComponents, selectedRepository)

  const handleRepositoryEditorOpened = async (event: MouseEvent): Promise<void> => {
    event.stopPropagation()
    if (disabled) {
      return
    }

    showPopup(
      SelectPopup,
      { value: components, placeholder: popupPlaceholder, searchable: false },
      eventToHTMLElement(event),
      onChange
    )
  }
</script>

{#if value == null}
  <Button
    {kind}
    {justify}
    {size}
    {focusIndex}
    {showTooltip}
    {disabled}
    {label}
    icon={showIcon ? github.icon.Github : undefined}
    iconRight={IconChevronDown}
    on:click={handleRepositoryEditorOpened}
  >
    <svelte:fragment slot="content">
      {#if selectedRepository !== undefined}
        <div class="p-1">
          <Icon icon={github.icon.Github} size={'small'} />
        </div>
        {selectedRepository.name}
      {/if}
    </svelte:fragment>
  </Button>
{:else}
  <HyperlinkEditor
    value={repository?.htmlURL ?? ''}
    placeholder={getEmbeddedLabel(repository?.name ?? '')}
    title={repository?.name ?? ''}
    readonly
    icon={github.icon.Github}
    {kind}
    {size}
    {justify}
    {width}
  />
{/if}
