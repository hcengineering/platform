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
  import type { Candidate } from '@hcengineering/recruit'
  import { Icon, tooltip } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import recruit from '../plugin'
  import ApplicationsPopup from './ApplicationsPopup.svelte'

  export let value: number
  export let object: Candidate
</script>

{#if value && value > 0}
  <DocNavLink {object} inline noUnderline={true}>
    <div
      use:tooltip={{
        component: ApplicationsPopup,
        props: { value: object }
      }}
      class="sm-tool-icon"
    >
      <span class="icon"><Icon icon={recruit.icon.Application} size={'small'} /></span>&nbsp;{value}
    </div>
  </DocNavLink>
{/if}
