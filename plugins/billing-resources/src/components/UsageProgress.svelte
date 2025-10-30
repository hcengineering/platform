<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { IntlString } from '@hcengineering/platform'
  import { Label, PaletteColorIndexes, Progress, humanReadableFileSize } from '@hcengineering/ui'
  import plugin from '../plugin'

  export let label: IntlString
  export let value: number // in bytes
  export let limit: number // in bytes

  $: color = value >= limit ? PaletteColorIndexes.Firework : undefined
</script>

<div class="flex-col flex-gap-2">
  <div class="flex-between text-md">
    <span><Label {label} /></span>
    <span class="flex-row-center flex-gap-1">
      {humanReadableFileSize(value, 10, 0)}
      <Label label={plugin.string.Of} />
      {humanReadableFileSize(limit, 10, 0)}
    </span>
  </div>
  <Progress {color} {value} max={limit} fallback={100} />
</div>
