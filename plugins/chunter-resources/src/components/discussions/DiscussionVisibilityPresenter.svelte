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
  import { Icon, Label, tooltip } from '@hcengineering/ui'

  import chunter from '../../plugin'
  import { getDiscussionVisibility } from '../../utils'

  export let value: Discussion
  export let shouldShowIcon = true

  $: visibility = getDiscussionVisibility(value)
  $: visibilityLabel =
    visibility === 'private'
      ? chunter.string.VisibilityMembers
      : visibility === 'participants'
        ? chunter.string.VisibilityParticipants
        : chunter.string.VisibilitySpace
  $: visibilityHint =
    visibility === 'private'
      ? chunter.string.VisibilityMembersDescription
      : visibility === 'participants'
        ? chunter.string.VisibilityParticipantsDescription
        : chunter.string.VisibilitySpaceDescription
  $: visibilityIcon =
    visibility === 'private' ? chunter.icon.Lock : visibility === 'participants' ? contact.icon.ComponentMembers : null
</script>

<span class="flex-center caption-color" use:tooltip={{ label: visibilityHint }}>
  {#if shouldShowIcon}
    {#if visibilityIcon != null}
      <Icon icon={visibilityIcon} size="small" />
    {/if}
  {:else}
    <Label label={visibilityLabel} />
  {/if}
</span>
