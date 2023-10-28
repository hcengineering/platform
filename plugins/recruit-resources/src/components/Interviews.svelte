<script lang="ts">
  import core, { Doc, DocumentQuery, Ref, WithLookup } from '@hcengineering/core'
  import { Button, Component, IconAdd, Label, Loading, SearchEdit, showPopup } from '@hcengineering/ui'
  import view, { BuildModelKey, ViewOptions, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { FilterBar, FilterButton, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import { Interview } from '@hcengineering/recruit'
  import recruit from '../plugin'
  import CreateInterview from './CreateInterview.svelte'

  let search: string = ''
  let searchQuery: DocumentQuery<Doc> = {}
  let resultQuery: DocumentQuery<Doc> = {}

  type InterviewInfo = { count: number; modifiedOn: number }
  let interviews: Map<Ref<Interview>, InterviewInfo> = new Map()

  $: searchQuery = search === '' ? {} : { $search: search }

  let viewlet: WithLookup<Viewlet> | undefined
  let loading = true

  let preference: ViewletPreference | undefined
  let viewOptions: ViewOptions | undefined

  function showCreateDialog () {
    showPopup(CreateInterview, { space: recruit.space.CandidatesPublic }, 'top')
  }

  function createConfig (
    descr: Viewlet,
    preference: ViewletPreference | undefined,
    interviews: Map<Ref<Interview>, InterviewInfo>,
    replacedKeys: Map<string, BuildModelKey>
  ): (string | BuildModelKey)[] {
    const base = preference?.config ?? descr.config
    const result: (string | BuildModelKey)[] = []
    for (const key of base) {
      if (typeof key === 'string') {
        result.push(replacedKeys.get(key) ?? key)
      } else {
        result.push(replacedKeys.get(key.key) ?? key)
      }
    }
    return result
  }
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label label={recruit.string.Interviews} /></span>
  </div>
  <div class="ac-header-full medium-gap mb-1">
    <ViewletSelector
      bind:loading
      bind:viewlet
      bind:preference
      viewletQuery={{
        attachTo: recruit.class.Interview
      }}
    />
    <Button icon={IconAdd} label={recruit.string.InterviewCreateLabel} kind={'primary'} on:click={showCreateDialog} />
  </div>
</div>

<div class="ac-header full divide search-start">
  <div class="ac-header-full small-gap">
    <SearchEdit bind:value={search} on:change={(e) => (search = e.detail)} />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
    <div class="buttons-divider" />
    <FilterButton _class={recruit.class.Interview} />
  </div>
  <div class="ac-header-full medium-gap">
    <ViewletSettingButton bind:viewOptions bind:viewlet />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
  </div>
</div>

<FilterBar
  _class={recruit.class.Interview}
  space={undefined}
  {viewOptions}
  query={searchQuery}
  on:change={(e) => (resultQuery = e.detail)}
/>


{#if loading}
  <Loading />
{:else if viewlet && viewlet?.$lookup?.descriptor?.component}
  <Component
    is={viewlet.$lookup.descriptor.component}
    props={{
      _class: recruit.class.Interview,
      options: viewlet.options,
      viewlet,
      viewOptions,
      config: createConfig(viewlet, preference, interviews, new Map()),
      viewOptionsConfig: viewlet.viewOptions?.other,
      query: {
        ...resultQuery
      },
      totalQuery: {},
      tableId: 'InterviewData'
    }}
  />
{/if}