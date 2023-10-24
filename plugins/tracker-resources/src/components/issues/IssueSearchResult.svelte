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
  import { IndexedDoc, Ref, docKey, Status } from '@hcengineering/core'
  // import type { Issue, Project } from '@hcengineering/tracker'
  import { FixedColumn, statusStore } from '@hcengineering/view-resources'
  import tracker, { Project } from '@hcengineering/tracker'

  // import { getIssueId } from '../../issues'
  import IssueStatusIcon from './IssueStatusIcon.svelte'

  export let value: IndexedDoc

  const keys = {
    title: docKey('title', { _class: tracker.class.Issue }),
    number: docKey('number', { _class: tracker.class.Issue }),
    status: docKey('status', { _class: tracker.class.Issue }),
    identifier: '|' +docKey('identifier', { _class: tracker.class.Project })
  }

  $: title = `${value[keys.identifier][0]}-${value[keys.number]}`
  $: name = `${value[keys.title]}`
  $: status = `${value[keys.status]}`
  $: st = $statusStore.get(status as Ref<Status>)
  $: space = value.space as Ref<Project>
</script>

<div class="flex-row-center h-8">
  <!-- <Icon icon={tracker.icon.TrackerApplication} size={'medium'} /> -->
  <FixedColumn key="object-popup-issue-status">
    {#if st}
      <IssueStatusIcon value={st} size={'small'} {space} />
    {/if}
  </FixedColumn>
  <span class="ml-2 max-w-120 overflow-label issue">
    <span class="title">{title}</span><span class="name">{name}</span>
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
