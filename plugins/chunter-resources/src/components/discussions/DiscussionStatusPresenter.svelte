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
  import { Icon, IconCheckCircle, tooltip } from '@hcengineering/ui'

  import chunter from '../../plugin'
  import { getDiscussionVisibility } from '../../utils'

  export let value: Discussion | undefined = undefined

  $: resolved = value?.resolved === true
  $: visibility = value !== undefined ? getDiscussionVisibility(value) : 'public'

  // A resolved discussion shows the resolved mark, an active one shows its visibility level.
  $: icon = resolved
    ? IconCheckCircle
    : visibility === 'private'
      ? chunter.icon.Lock
      : visibility === 'participants'
        ? chunter.icon.Collaborators
        : chunter.icon.Globe
  $: label = resolved
    ? chunter.string.Resolved
    : visibility === 'private'
      ? chunter.string.VisibilityMembersDescription
      : visibility === 'participants'
        ? chunter.string.VisibilityParticipantsDescription
        : chunter.string.VisibilitySpaceDescription
</script>

<span class="status flex-center caption-color" class:resolved>
  <span class="flex-center" use:tooltip={{ label }}>
    <Icon {icon} size="small" />
  </span>
</span>

<style lang="scss">
  .status {
    width: 1rem;
    height: 1rem;
  }

  .resolved {
    color: var(--positive-button-default);
  }
</style>
