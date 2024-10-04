<script lang="ts">
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IntlString, translate, translateCB } from '@hcengineering/platform'
  import { Button, IModeSelector, IconDetails, IconDetailsFilled, themeStore } from '@hcengineering/ui'
  import { ViewOptions, Viewlet } from '@hcengineering/view'
  import { FilterBar, SpaceHeader, ViewletContentView, ViewletSettingButton } from '@hcengineering/view-resources'
  import { GithubPullRequest } from '@hcengineering/github'
  import github from '../plugin'

  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<GithubPullRequest> = {}
  export let title: IntlString | undefined = undefined
  export let label: string = ''
  export let panelWidth: number = 0
  export let modeSelectorProps: IModeSelector | undefined = undefined

  let viewlet: WithLookup<Viewlet> | undefined = undefined
  const viewlets: WithLookup<Viewlet>[] = []
  let viewOptions: ViewOptions | undefined
  let search = ''
  let searchQuery: DocumentQuery<GithubPullRequest> = { ...query }
  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? { ...query } : { ...query, $search: search }
  }
  $: if (query) updateSearchQuery(search)
  let resultQuery: DocumentQuery<GithubPullRequest> = { ...searchQuery }

  $: if (!label && title) {
    translateCB(title, {}, $themeStore.language, (res) => {
      label = res
    })
  }

  let asideFloat: boolean = false
  let asideShown: boolean = true
  $: if (panelWidth < 900 && !asideFloat) asideFloat = true
  $: if (panelWidth >= 900 && asideFloat) {
    asideFloat = false
    asideShown = false
  }
  let docWidth: number
  let docSize: boolean = false
  $: if (docWidth <= 900 && !docSize) docSize = true
  $: if (docWidth > 900 && docSize) docSize = false
</script>

<SpaceHeader
  bind:viewlet
  bind:search
  _class={github.class.GithubPullRequest}
  showLabelSelector={$$slots.label_selector}
  {viewlets}
  {label}
  {space}
  {modeSelectorProps}
>
  <svelte:fragment slot="label_selector">
    <slot name="label_selector" />
  </svelte:fragment>
  <svelte:fragment slot="extra">
    <ViewletSettingButton bind:viewOptions bind:viewlet />
    {#if asideFloat && $$slots.aside}
      <div class="buttons-divider" />
      <Button
        icon={asideShown ? IconDetailsFilled : IconDetails}
        kind={'ghost'}
        size={'medium'}
        selected={asideShown}
        on:click={() => {
          asideShown = !asideShown
        }}
      />
    {/if}
  </svelte:fragment>
</SpaceHeader>
{#if viewlet && viewOptions}
  <FilterBar
    _class={github.class.GithubPullRequest}
    query={searchQuery}
    {space}
    {viewOptions}
    on:change={(e) => (resultQuery = e.detail)}
  />
  <slot name="afterHeader" />
  <div class="popupPanel rowContent">
    {#if viewlet}
      <ViewletContentView _class={github.class.GithubPullRequest} {viewlet} query={resultQuery} {space} {viewOptions} />
    {/if}
    {#if $$slots.aside !== undefined && asideShown}
      <div class="popupPanel-body__aside" class:shown={asideShown}>
        <slot name="aside" />
      </div>
    {/if}
  </div>
{/if}
