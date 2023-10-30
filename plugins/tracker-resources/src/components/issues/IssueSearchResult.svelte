<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
// 
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { IndexedDoc, createIndexedReader, IndexedReader, Ref, Status } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { FixedColumn, statusStore } from '@hcengineering/view-resources'
  import tracker, { Project } from '@hcengineering/tracker'

  // import { getIssueId } from '../../issues'
  import IssueStatusIcon from './IssueStatusIcon.svelte'

  export let value: IndexedDoc

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const valueReader = createIndexedReader(tracker.class.Issue, hierarchy, value)
  const projectReader = valueReader.getDoc('space') as IndexedReader<Project>

  const dispatch = createEventDispatcher()

  let title: string

  $: if (projectReader.get('identifier') !== undefined) {
    title = `${projectReader.get('identifier')[0]}-${valueReader.get('number')}`
  } else {
    title = valueReader.get('number')
  }

  $: status = valueReader.get('status')
  $: st = $statusStore.byId.get(status as Ref<Status>)
  $: space = value.space as Ref<Project>

  $: dispatch('title', title)
  onMount(() => {
    dispatch('title', title)
  })
</script>

<div class="flex-row-center h-8">
  <!-- <Icon icon={tracker.icon.TrackerApplication} size={'medium'} /> -->
  <FixedColumn key="object-popup-issue-status">
    {#if st}
      <IssueStatusIcon value={st} size={'small'} {space} />
    {/if}
  </FixedColumn>
  <span class="ml-2 max-w-120 overflow-label issue">
    <span class="title">{title}</span><span class="name">{valueReader.get('title')}</span>
  </span>
</div>

<style lang="scss">
  .issue {
    display: flex;
    flex-direction: row;

    .title {
      display: flex;
      padding-right: 0.5rem;
      color: var(--theme-darker-color);
    }
    .name {
      display: flex;
      flex: 1;
    }
  }
</style>
