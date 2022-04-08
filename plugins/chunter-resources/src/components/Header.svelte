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
  import type { Asset } from '@anticrm/platform'
  import { Icon } from '@anticrm/ui'

  export let icon: Asset | undefined
  export let label: string
  export let description: string | undefined
</script>

<div class="ac-header__wrap-description">
  <div class="ac-header__wrap-title" on:click>
    {#if icon}<div class="ac-header__icon"><Icon {icon} size={'small'} /></div>{/if}
    <span class="ac-header__title">{label}</span>
  </div>
  {#if description}<span class="ac-header__description">{description}</span>{/if}
</div>

<style lang="scss">
  .ac-header__wrap-title:hover {
    cursor: pointer;
    span {
      text-decoration: underline;
    }
  }
</style>
