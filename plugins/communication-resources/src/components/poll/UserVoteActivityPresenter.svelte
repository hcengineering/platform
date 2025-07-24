<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->
<script lang="ts">
  import { ActivityAttributeUpdate } from '@hcengineering/communication-types'
  import communication, { UserVote } from '@hcengineering/communication'
  import { Icon, Label } from '@hcengineering/ui'

  export let update: ActivityAttributeUpdate

  let addedVote: UserVote | undefined = undefined

  $: addedVote = update.added?.[0] as UserVote | undefined
  $: voteLabel = addedVote?.options?.map((it) => it.label).join(', ') ?? ''
</script>

<span class="container overflow-label">
  <span class="icon mr-1"> <Icon icon={communication.icon.Poll} size="small" /> </span>
  {#if addedVote}
    <Label label={communication.string.VotedFor} />
    <span class="strong overflow-label flex-shrink" title={voteLabel}>{voteLabel}</span>
  {:else}
    <Label label={communication.string.RevokedVote} />
  {/if}
</span>

<style lang="scss">
  .container {
    display: inline-flex;
    gap: 0.5rem;
    white-space: nowrap;
    flex-shrink: 1;
  }
  .strong {
    font-weight: 500;
  }

  .icon {
    display: flex;
    align-items: center;
    color: var(--global-secondary-TextColor);
    fill: var(--global-secondary-TextColor);
  }
</style>
