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
  import type { Space } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { Icon, Label } from '@hcengineering/ui'
  import plugin from '../plugin'
  import IconMembersOutline from './icons/MembersOutline.svelte'
  import SpaceMembers from './SpaceMembers.svelte'

  export let label: IntlString = plugin.string.Members
  export let space: Space
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <div class="antiSection-header__icon">
      <Icon icon={IconMembersOutline} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <Label {label} />
    </span>
  </div>
  <SpaceMembers {space} />
</div>
