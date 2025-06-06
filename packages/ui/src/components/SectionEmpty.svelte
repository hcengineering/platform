<!--
//
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
//
-->

<script lang="ts">
  import type { IntlString } from '@hcengineering/platform'
  import type { ComponentProps } from 'svelte'

  import Icon from './Icon.svelte'
  import Label from './Label.svelte'

  export let icon: ComponentProps<Icon>['icon']
  export let label: IntlString
  export let labelParams: Record<string, any> = {}
</script>

<div class="antiSection-empty solid flex-col-center mt-3">
  <div class="flex-center caption-color">
    <Icon {icon} size="large" />
  </div>
  <span class="text-sm content-dark-color mt-2">
    <Label {label} params={labelParams} />
  </span>
  <slot />
</div>
