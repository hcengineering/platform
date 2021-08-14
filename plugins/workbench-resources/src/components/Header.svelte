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
  import type { IntlString, Asset } from '@anticrm/platform'
  import { Icon } from '@anticrm/ui'

  export let icon: Asset | undefined
  export let label: IntlString
  export let description: IntlString | undefined
</script>

<div class="container">
  <div class="flex-center">
    {#if icon }<span class="icon"><Icon {icon} size={'small'}/></span>{/if}
    <span class="label">{label}</span>
  </div>
  {#if description }<div class="description">{description}</div>{/if}
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    width: 100%;

    .icon {
      margin-right: .5rem;
      opacity: .6;
    }
    .label, .description {
      flex-grow: 1;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      user-select: none;
    }
    .label {
      font-weight: 500;
      font-size: 1rem;
      color: var(--theme-caption-color);
    }
    .description {
      font-size: .75rem;
      color: var(--theme-content-trans-color);
    }
  }
</style>
