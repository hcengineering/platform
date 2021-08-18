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

import { TextArea, EditBox, Dialog, Tabs, Section, Grid, IconComments } from '@anticrm/ui'
import { AttributeEditor, getClient, CommentViewer } from '@anticrm/presentation'
import type { Candidate } from '@anticrm/recruit'

import File from './icons/File.svelte'
import Address from './icons/Address.svelte'


import contact from '@anticrm/contact'

export let object: Candidate
export let newValue: Candidate

</script>

<Section icon={File} label={'Personal Information'}>
  <Grid>
    <AttributeEditor _class={contact.class.Person} key={'firstName'} {newValue} oldValue={object} focus/>
    <AttributeEditor _class={contact.class.Person} key={'lastName'} {newValue} oldValue={object}/>
    <AttributeEditor _class={contact.class.Person} key={'email'} {newValue} oldValue={object}/>
    <AttributeEditor _class={contact.class.Person} key={'phone'} {newValue} oldValue={object}/>
  </Grid>
</Section>
<Section icon={Address} label={'Address'}>
  <Grid>
    <EditBox label={'Street'} placeholder={'Broderick st'} />
    <EditBox label={'City *'} placeholder={'Los Angeles'} bind:value={newValue.city}/>
    <EditBox label={'ZIP / Postal code'} placeholder={'26892'} />
    <EditBox label={'Country'} placeholder={'United States'} />
  </Grid>
</Section>
