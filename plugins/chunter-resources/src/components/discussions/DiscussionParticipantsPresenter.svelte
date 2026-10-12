<!--
//
// Copyright © 2026 TraceX SAS.
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
  import { type Discussion } from '@hcengineering/chunter'
  import contact from '@hcengineering/contact'
  import { CombineAvatars, employeeByIdStore, employeeRefByAccountUuidStore } from '@hcengineering/contact-resources'
  import { type Collaborator, type WithLookup, notEmpty } from '@hcengineering/core'
  import { ObjectsTooltipWrapper } from '@hcengineering/view-resources'

  import chunter from '../../plugin'
  import { getDiscussionVisibility } from '../../utils'

  interface DiscussionWithCollaborators extends WithLookup<Discussion> {
    $lookup?: WithLookup<Discussion>['$lookup'] & { collaborators?: Collaborator[] }
  }

  export let value: DiscussionWithCollaborators

  $: visibility = getDiscussionVisibility(value)
  $: collaborators = value.$lookup?.collaborators ?? []

  // Private discussions have explicit members; other discussions show their collaborators.
  $: accounts =
    visibility === 'private' ? value.members : Array.from(new Set(collaborators.map((item) => item.collaborator)))
  $: memberRefs = accounts.map((account) => $employeeRefByAccountUuidStore.get(account)).filter(notEmpty)
  $: members = memberRefs.map((ref) => $employeeByIdStore.get(ref)).filter(notEmpty)
</script>

<ObjectsTooltipWrapper
  selectedCount={memberRefs.length}
  objects={members}
  objectIds={memberRefs}
  _class={contact.mixin.Employee}
  label={chunter.string.Members}
>
  <span class="flex-presenter flex-gap-2">
    {#if memberRefs.length > 0}
      <CombineAvatars _class={contact.mixin.Employee} items={memberRefs} size="x-small" limit={3} />
    {/if}
    <span class="caption-color text-xs">{accounts.length}</span>
  </span>
</ObjectsTooltipWrapper>
