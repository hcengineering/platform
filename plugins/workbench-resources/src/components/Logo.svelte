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
  import { createQuery, getFileSrcSet, getFileUrl } from '@hcengineering/presentation'
  import setting, { WorkspaceSetting } from '@hcengineering/setting'

  export let mini: boolean = false
  export let workspace: string
  const wsSettingQuery = createQuery()

  let workspaceSetting: WorkspaceSetting | undefined = undefined
  wsSettingQuery.query(setting.class.WorkspaceSetting, {}, (res) => {
    workspaceSetting = res[0]
  })
  $: url = workspaceSetting?.icon != null ? getFileUrl(workspaceSetting.icon) : undefined
  $: srcset = workspaceSetting?.icon != null ? getFileSrcSet(workspaceSetting.icon, 128) : undefined
</script>

{#if workspaceSetting?.icon != null && url != null}
  <img class="logo-medium" src={url} {srcset} alt={''} />
{:else}
  <div class="antiLogo red" class:mini>{workspace?.toUpperCase()?.[0] ?? ''}</div>
{/if}

<style lang="scss">
  .antiLogo {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    font-weight: 500;
    color: var(--primary-button-color);
    border-radius: 0.25rem;
    outline: none;
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }
    &:not(.mini) {
      width: 2rem;
      height: 2rem;
    }
    &.mini {
      width: 1.75rem;
      height: 1.75rem;
    }
    &.red {
      background-color: rgb(246, 105, 77);
    }
  }
  .logo-medium {
    outline: none;
    cursor: pointer;
    width: 2rem;
    height: 2rem;
    border-radius: 0.25rem;
  }
</style>
