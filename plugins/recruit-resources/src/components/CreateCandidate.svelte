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
  import { TextArea, EditBox, Dialog, Tabs, Section, Grid } from '@anticrm/ui'
  import File from './icons/File.svelte'
  import Address from './icons/Address.svelte'
  import Attachment from './icons/Attachment.svelte'
  import DialogHeader from './DialogHeader.svelte'

  import { getClient } from '@anticrm/presentation'

  import recruit from '../plugin'

  export let space: Ref<Space>

  const dispatch = createEventDispatcher()

  let firstName: string = ''
  let lastName: string = ''
  let email: string = ''
  let phone: string = ''
  let city: string = ''

  const client = getClient()

  function createCandidate() {
    client.createDoc(recruit.class.Candidate, space, {
      firstName,
      lastName,
      email,
      phone,
      city,
    })
  }
</script>

<DialogHeader {space}/>
