<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Account, Ref } from '@hcengineering/core'
  import { onMount } from 'svelte'
  import { loadUsersStatus, statusByUserStore } from '../utils'

  export let user: Ref<Account>
  export let size: 'small' | 'medium' = 'small'
  export let background: string = 'red'

  onMount(() => {
    loadUsersStatus()
  })

  $: userStatus = $statusByUserStore.get(user)
</script>

<div class="container {size}" style="background-color: {background}">
  <div
    class="status {size}"
    style="background-color: {background}"
    class:online={userStatus?.online}
    class:offline={!userStatus?.online}
  />
</div>

<style lang="scss">
  .container {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;

    &.small {
      width: 0.625rem;
      height: 0.625rem;
    }

    &.medium {
      width: 0.875rem;
      height: 0.875rem;
    }
  }
  .status {
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;

    &.online {
      background-color: var(--global-online-color) !important;
    }

    &.offline {
      border: 1px solid var(--global-offline-color);
    }
    &.small {
      width: 0.375rem;
      height: 0.375rem;
    }

    &.medium {
      width: 0.625rem;
      height: 0.625rem;
    }
  }
</style>
