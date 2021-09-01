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
  import type { Ref, Space, Doc } from '@anticrm/core'
  import { FloatDialog, Tabs } from '@anticrm/ui'
  import { getClient } from '@anticrm/presentation'
  import type { Candidate } from '@anticrm/recruit'
  import DialogHeader from './DialogHeader.svelte'
  
  import recruit from '../plugin'

  export let object: Candidate
  export let space: Ref<Space>

  const newValue = Object.assign({}, object)

  let resume = {} as {
    id: Ref<Doc> | undefined
    name: string
    uuid: string
    size: number
    type: string
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function save() {
    const attributes: Record<string, any> = {}
    for (const key in object) {
      if ((newValue as any)[key] !== (object as any)[key]) {
        attributes[key] = (newValue as any)[key]
      }
    }
    await client.updateDoc(recruit.class.Candidate, object.space, object._id, attributes)

    dispatch('close')
  }

  const tabModel = [
    // {
    //   label: 'General',
    //   component: 'recruit:component:CandidateGeneral',
    //   props: {
    //     object,
    //     newValue,
    //   }
    // },
    {
      label: 'Activity',
      component: 'chunter:component:Activity',
      props: {
        object,
        space
      }
    },
    {
      label: 'Attachments',
      component: 'recruit:component:Attachments',
      props: {
        object,
        space
      }
    }
  ]

</script>

<div class="container">
  <DialogHeader {space} {object} {newValue} {resume} on:save={ save }/>
  <div class="tabs-container">
    <Tabs model={tabModel}/>
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--theme-bg-color);
    border-radius: 1.25rem;

    .tabs-container {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      height: fit-content;
      padding: 0 2.5rem 2.5rem;
    }
  }
</style>
