<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { createEventDispatcher } from 'svelte'
  import type { Ref, Space } from '@anticrm/core'
  import { Dialog, Tabs } from '@anticrm/ui'
  import { getClient } from '@anticrm/presentation'
  import type { Candidate } from '@anticrm/recruit'
  import DialogHeader from './DialogHeader.svelte'
  
  import recruit from '../plugin'

  export let object: Candidate
  export let space: Ref<Space>

  const dispatch = createEventDispatcher()
  const client = getClient()

  const newValue = Object.assign({}, object)

  async function save() {
    const attributes: Record<string, any> = {}
    for (const key in object) {
      if ((newValue as any)[key] !== (object as any)[key]) {
        attributes[key] = (newValue as any)[key]
      }
    }
    await client.updateDoc(recruit.class.Candidate, object.space, object._id, attributes)
  }

  const tabModel = [
    {
      label: 'General',
      component: 'recruit:component:CandidateGeneral',
      props: {
        object,
        newValue,
      }
    },
    {
      label: 'Activity',
      component: 'chunter:component:Activity',
      props: {
        object,
        space
      }
    }
  ]

</script>

<Dialog label={recruit.string.CreateCandidate} 
        okLabel={recruit.string.CreateCandidate} 
        okAction={save}
        on:close={() => { dispatch('close') }}>
  <DialogHeader />
  <Tabs model={tabModel}/>
</Dialog>

