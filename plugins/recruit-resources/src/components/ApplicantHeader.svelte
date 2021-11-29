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
  import { AttributeBarEditor, getClient, UserBox } from '@anticrm/presentation'
  import { Applicant } from '@anticrm/recruit'
  import contact from '@anticrm/contact'

  export let object: Applicant
  const client = getClient()

  function change () {
    client.updateDoc(object._class, object.space, object._id, { employee: object.employee })
  }
</script>

<div class="flex-between header">
  <UserBox _class={contact.class.Employee} title='Assigned recruiter' caption='Recruiters' bind:value={object.employee} on:change={change} />
  <AttributeBarEditor key={'state'} {object} showHeader={false} />
</div>

<style lang="scss">
  .header {
    width: 100%;
    padding: 0 .5rem;
  }
</style>