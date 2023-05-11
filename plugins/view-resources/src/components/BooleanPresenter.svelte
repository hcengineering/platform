<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { BooleanIcon, Label } from '@hcengineering/ui'
  import { getBooleanLabel } from '../utils'

  export let value: any
  export let inline: boolean = false
</script>

<div class="{inline ? 'inline-presenter' : 'flex-presenter'} yesno-container">
  <div class="icon small-gap"><BooleanIcon {value} /></div>
  <span><Label label={getBooleanLabel(value)} /></span>
</div>

<style lang="scss">
  .yesno-container {
    max-width: fit-content;
    user-select: none;

    span {
      width: 1.6rem;
      white-space: nowrap;
      text-transform: capitalize;
      color: var(--theme-caption-color);
    }
  }
</style>
