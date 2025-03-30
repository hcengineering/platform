<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { concatLink } from '@hcengineering/core'
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { NavLink } from '@hcengineering/presentation'
  import { getCurrentLocation, locationToUrl } from '@hcengineering/ui'
  import { cardId, Card, ParentInfo } from '@hcengineering/card'

  export let value: Card | undefined

  export let maxWidth = ''

  function getHref (parentInfo: ParentInfo) {
    const loc = getCurrentLocation()
    loc.path[2] = cardId
    loc.path[3] = parentInfo._id
    loc.path.length = 4
    const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
    return concatLink(frontUrl, locationToUrl(loc))
  }
</script>

{#if value && Array.isArray(value.parentInfo)}
  <div class="root" style:max-width={maxWidth}>
    <span class="names">
      {#each value.parentInfo as parentInfo}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <NavLink href={getHref(parentInfo)}>
          <span class="parent-label overflow-label cursor-pointer" title={parentInfo.title}>
            {parentInfo.title}
          </span>
        </NavLink>
      {/each}
    </span>
  </div>
{/if}

<style lang="scss">
  .root {
    display: inline-flex;
    margin-left: 0;
    min-width: 0;

    .names {
      display: inline-flex;
      min-width: 0;
      color: var(--theme-dark-color);
    }

    .parent-label {
      flex-shrink: 5;
      color: var(--theme-dark-color);

      &:hover {
        color: var(--theme-caption-color);
        text-decoration: underline;
      }
      &:active {
        color: var(--theme-content-color);
      }
      &::after {
        content: '›';
        padding: 0 0.25rem;
      }
    }
  }
</style>
