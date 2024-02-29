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
  import setting, { WorkspaceSetting } from '@hcengineering/setting'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Component, Icon } from '@hcengineering/ui'
  import contact, { type GetAvatarUrl } from '@hcengineering/contact'
  import { getResource } from '@hcengineering/platform'

  export let mini: boolean = false
  export let workspace: string
  const wsSettingQuery = createQuery()
  let getFileUrl: undefined | GetAvatarUrl = undefined
  getResource(contact.function.GetFileUrl).then((r) => (getFileUrl = r))
  const client = getClient()
  let workspaceSetting: WorkspaceSetting | undefined = undefined
  wsSettingQuery.query(setting.class.WorkspaceSetting, {}, (res) => {
    workspaceSetting = res[0]
  })
  $: url =
    getFileUrl !== undefined && workspaceSetting?.icon != null ? getFileUrl(workspaceSetting.icon, 'large') : ['']
  $: srcset = url?.slice(1)?.join(', ')
</script>

{#if getFileUrl !== undefined && workspaceSetting?.icon != null}
  <img class="logo-medium" src={url[0]} {srcset} alt={''} />
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
      width: 1.5rem;
      height: 1.5rem;
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
