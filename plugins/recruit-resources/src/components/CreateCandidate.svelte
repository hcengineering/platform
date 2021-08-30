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
  import { TextArea, EditBox, Dialog, Tabs, Section, Grid } from '@anticrm/ui'
  import File from './icons/File.svelte'
  import Address from './icons/Address.svelte'
  import Attachment from './icons/Attachment.svelte'
  import DialogHeader from './DialogHeader.svelte'

  import { getClient } from '@anticrm/presentation'

  import recruit from '../plugin'
  import chunter from '@anticrm/chunter'
  import { Candidate } from '@anticrm/recruit'

  export let space: Ref<Space>

  const object: Candidate = {
    lastName: '',
    firstName: '',
    city: ''
  } as Candidate
  const newValue = Object.assign({}, object)

  let resumeId: Ref<Doc>
  let resumeName: string | undefined
  let resumeUuid: string
  let resumeSize: number
  let resumeType: string

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function createCandidate() {
    console.log(newValue)
    // create candidate      
    const candidateId = await client.createDoc(recruit.class.Candidate, space, {
      firstName: newValue.firstName,
      lastName: newValue.lastName,
      email: '',
      phone: '',
      city: newValue.city,
    })

    if (resumeName !== undefined) {
      // create attachment
      client.createDoc(chunter.class.Attachment, space, {
        attachmentTo: candidateId,
        collection: 'resume',
        name: resumeName,
        file: resumeUuid,
        type: resumeType,
        size: resumeSize,
      }, resumeId)
    }

    dispatch('close')
  }

</script>

<DialogHeader {space} {object} {newValue} {resumeId} {resumeName} {resumeUuid} {resumeSize} {resumeType} create={true} on:save={createCandidate}/>
