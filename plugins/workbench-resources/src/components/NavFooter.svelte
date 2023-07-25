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
  import setting from '@hcengineering/setting'
  import { Icon, Label, showPopup } from '@hcengineering/ui'
  import workbench from '../plugin'
  import HelpAndSupport from './HelpAndSupport.svelte'
</script>

<div class="antiNav-footer-line" />
<div class="antiNav-footer-grower" />
<div class="antiNav-footer">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="antiNav-element" style:flex-grow={1} on:click={() => showPopup(HelpAndSupport, {}, 'help-center')}>
    <div class="an-element__icon">
      <Icon icon={setting.icon.Support} size={'small'} />
    </div>
    <span class="an-element__label title dark">
      <Label label={workbench.string.HelpAndSupport} />
    </span>
  </div>
  <slot />
</div>
