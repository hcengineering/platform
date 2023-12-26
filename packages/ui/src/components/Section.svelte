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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import type { AnySvelteComponent } from '../types'

  import Icon from './Icon.svelte'
  import Label from './Label.svelte'

  export let label: IntlString
  export let icon: Asset | AnySvelteComponent | undefined = undefined

  export let showHeader: boolean = true
  export let high: boolean = false
  export let invisible: boolean = false
</script>

<div class="antiSection">
  {#if showHeader}
    <div class="antiSection-header" class:high class:invisible>
      {#if icon}
        <div class="antiSection-header__icon">
          <Icon {icon} size={'small'} />
        </div>
      {/if}

      <span class="antiSection-header__title flex-row-center">
        <Label {label} />
      </span>

      <slot name="header" />
    </div>
  {/if}

  <slot name="content" />
</div>
