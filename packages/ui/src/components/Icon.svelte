<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import { getMetadata } from '@anticrm/platform'

  export let icon: Asset
  export let size: 'small' | 'medium' | 'large'
  export let fill = 'var(--theme-caption-color)'

  let url: string
  $: url = getMetadata(icon) ?? 'https://anticrm.org/logo.svg'
</script>

<svg class={size} {fill}>
  <use href={url} />
</svg>

<style lang="scss">
  .small {
    width: 1.143em;
    height: 1.143em;
  }
  .medium {
    width: 1.429em;
    height: 1.429em;
  }
  .large {
    width: 1.714em;
    height: 1.714em;
  }
</style>
