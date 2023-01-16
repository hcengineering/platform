<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { IssuePriority } from '@hcengineering/tracker'
  import { Button, ButtonKind, ButtonSize, Icon, Label } from '@hcengineering/ui'
  import { issuePriorities } from '../../utils'

  export let value: IssuePriority

  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = undefined
</script>

{#if kind === 'list' || kind === 'list-header'}
  <div class="priority-container">
    <div class="icon">
      {#if issuePriorities[value]?.icon}<Icon icon={issuePriorities[value]?.icon} {size} />{/if}
    </div>
    <span
      class="{kind === 'list' ? 'ml-2 text-md' : 'ml-3 text-base'} overflow-label disabled fs-bold content-accent-color"
    >
      <Label label={issuePriorities[value]?.label} />
    </span>
  </div>
{:else}
  <Button
    label={issuePriorities[value]?.label}
    icon={issuePriorities[value]?.icon}
    {justify}
    {width}
    {size}
    {kind}
    disabled
  />
{/if}

<style lang="scss">
  .priority-container {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    min-width: 0;
    cursor: pointer;

    .icon {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      width: 1rem;
      height: 1rem;
      color: var(--content-color);
    }
    &:hover {
      .icon {
        color: var(--caption-color) !important;
      }
    }
  }
</style>
