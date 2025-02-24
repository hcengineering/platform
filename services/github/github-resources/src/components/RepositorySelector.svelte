<!--
// Copyright © 2024 Hardcore Engineering Inc.
//
-->
<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import { IntlString, getEmbeddedLabel } from '@hcengineering/platform'
  import type { ButtonKind, ButtonShape, ButtonSize, LabelAndProps, SelectPopupValueType } from '@hcengineering/ui'
  import { ButtonWithDropdown, Icon, IconDropdown, SelectPopup, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { GithubIntegrationRepository, GithubProject } from '@hcengineering/github'
  import github from '../plugin'
  import { integrationRepositories } from './utils'

  export let value: Ref<GithubIntegrationRepository> | null | undefined
  export let githubProject: Ref<GithubProject>

  // export let shouldShowLabel: boolean = true
  export let isEditable: boolean = true
  export let onChange: ((newRepositoryId: Ref<GithubIntegrationRepository> | undefined) => void) | undefined = undefined
  export let popupPlaceholder: IntlString = github.string.Repository

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'

  export let focusIndex: number | undefined = undefined

  export let showTooltip: LabelAndProps | undefined = undefined

  let selectedRepository: GithubIntegrationRepository | undefined

  $: rawComponents = Array.from($integrationRepositories.values()).filter((it) => it.githubProject === githubProject)

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
      })),
      {
        id: null,
        label: github.string.WithoutRepository
      }
    ]
  }

  let components: SelectPopupValueType[] = []
  $: components = getRepositoryInfo(rawComponents, selectedRepository)

  const handleRepositoryEditorOpened = async (event: MouseEvent): Promise<void> => {
    event.stopPropagation()
    if (!isEditable) {
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

<ButtonWithDropdown
  {kind}
  {justify}
  {size}
  {focusIndex}
  showTooltipMain={showTooltip}
  dropdownItems={components}
  disabled={!isEditable}
  label={github.string.NoRepository}
  dropdownIcon={IconDropdown}
  on:click={handleRepositoryEditorOpened}
  on:dropdown-selected={(ev) => {
    if (ev.detail != null) {
      value = ev.detail
    }
  }}
>
  <svelte:fragment slot="content">
    {#if selectedRepository !== undefined}
      <div class="p-1">
        <Icon icon={github.icon.Github} size={'small'} />
      </div>
      {selectedRepository.name}
    {/if}
  </svelte:fragment>
</ButtonWithDropdown>
