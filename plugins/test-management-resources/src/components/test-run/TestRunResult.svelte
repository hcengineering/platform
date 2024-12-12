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
  import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'

  import { MultiProgress } from '@hcengineering/ui'

  import { type TestRunStats } from '../../testRunUtils'

  export let value: TestRunStats

  $: items = [
    {
      value: value.untested,
      color: PaletteColorIndexes.Cloud
    },
    {
      value: value.blocked,
      color: PaletteColorIndexes.Orange
    },
    {
      value: value.failed,
      color: PaletteColorIndexes.Firework
    },
    {
      value: value.completed,
      color: PaletteColorIndexes.Grass
    }
  ]
  $: max = items.reduce((acc, it) => acc + it.value, 0)
</script>

<div class="w-full">
  <MultiProgress {max} values={items} />
</div>
