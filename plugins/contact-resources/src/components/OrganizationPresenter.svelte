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
  import { Organization } from '@anticrm/contact'
  import { showPopup } from '@anticrm/ui'
  import Company from './icons/Company.svelte'
  import { EditDoc } from '@anticrm/view-resources'

  export let value: Organization

  async function onClick () {
    showPopup(EditDoc, { _id: value._id, _class: value._class }, 'full')
  }
</script>

{#if value}
  <div class="sm-tool-icon" on:click={onClick}>
    <span class="icon small-size flex-center"><Company size={'small'} /></span>&nbsp;{value.name}
  </div>
{/if}
