<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { DocumentQuery, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Issue, Project } from '@hcengineering/tracker'
  import tracker from '../../plugin'
  import IssuesView from './IssuesView.svelte'

  export let currentSpace: Ref<Project>

  const statusQuery = createQuery()
  let query: DocumentQuery<Issue> = {}
  $: statusQuery.query(
    tracker.class.IssueStatus,
    { category: tracker.issueStatusCategory.Backlog, space: currentSpace },
    (result) => {
      query = { status: { $in: result.map(({ _id }) => _id) }, space: currentSpace }
    }
  )
</script>

<IssuesView {query} space={currentSpace} title={tracker.string.BacklogIssues} />
