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
  import type { IntlString } from '@anticrm/platform'
  import { Label } from '@anticrm/ui'

  enum StatusColors {
    TURQUOISE = '#79C4CE',
    PURPLE = '#9D92C4',
    STINKYBLUE = '#72A6CC',
    GREEN = '#69B46D',
    ORANGE = '#C97661'
  }

  export let label: IntlString
  export let color: string = StatusColors.TURQUOISE

</script>

<div class="label-container" style="background-color: {color}">
  <Label {label} />
</div>

<style lang="scss">
  .label-container {
    padding: 4px 8px;
    font-weight: 500;
    font-size: 12px;
    text-align: center;
    color: #fff;
    border: 1px solid var(--theme-bg-accent-hover);
    border-radius: 8px;
  }
</style>
