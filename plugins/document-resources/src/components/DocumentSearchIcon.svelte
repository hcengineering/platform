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
  import DocumentIcon from './DocumentIcon.svelte'
  import document from '../plugin'

  import type { IconProps } from '@hcengineering/view'
  import type { Asset } from '@hcengineering/platform'

  export let icon: Asset
  export let color: number | number[] | undefined
  let iconValue: IconProps

  $: {
    iconValue = {}
    if (icon !== undefined && icon !== '') {
      iconValue.icon = icon
    }
    if (color !== undefined && (color as any) !== '') {
      iconValue.color = color
    }
  }
</script>

<DocumentIcon value={iconValue} size={'medium'} defaultIcon={document.icon.Document} />
