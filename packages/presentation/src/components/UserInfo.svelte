<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import Avatar from './Avatar.svelte'

  import type { Person } from '@anticrm/contact'

  export let value: Person
  export let subtitle: string | undefined = undefined
  export let size: 24 | 28 | 32 | 34 | 36 = 24
</script>

<div class="user-container">
  <Avatar {size} />
  <div class="user-info">
    {#if subtitle}<div class="subtitle">{subtitle}</div>{/if}
    <div class="title">{value.firstName + ' ' + value.lastName}</div>
  </div>
</div>

<style lang="scss">
  .user-container {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;

    .user-info {
      display: flex;
      flex-direction: column;
      margin-left: 8px;
      font-family: inherit;
      color: var(--theme-content-accent-color);

      .subtitle {
        font-size: 12px;
        color: var(--theme-content-dark-color);
      }
      .title {
        max-width: 150px;
        font-weight: 500;
        text-align: left;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }
  }
</style>