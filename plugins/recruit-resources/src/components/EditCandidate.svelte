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
  import { TextArea, EditBox, Dialog, Tabs, Section, Grid, DialogHeader, IconComments } from '@anticrm/ui'
  import { AttributeEditor, getClient, CommentViewer } from '@anticrm/presentation'
  import { ReferenceInput } from '@anticrm/text-editor'
  import type { Candidate } from '@anticrm/recruit'
  import type { Backlink } from '@anticrm/chunter'
  import { Backlink as BacklinkComponent } from '@anticrm/presentation'
  import File from './icons/File.svelte'
  import Address from './icons/Address.svelte'
  import Attachment from './icons/Attachment.svelte'

  import { createQuery } from '@anticrm/presentation'

  import recruit from '../plugin'
  import chunter from '@anticrm/chunter'
  import contact from '@anticrm/contact'

  export let object: Candidate

  let newValue = Object.assign({}, object)

  const dispatch = createEventDispatcher()

  let backlinks: Backlink[]

  const client = getClient()
  const query = createQuery()
  $: query.query(chunter.class.Backlink, { objectId: object._id }, result => { backlinks = result })

  function save() {
    const attributes: Record<string, any> = {}
    for (const key in object) {
      if ((newValue as any)[key] !== (object as any)[key]) {
        attributes[key] = (newValue as any)[key]
      }
    }
    client.updateDoc(recruit.class.Candidate, object.space, object._id, attributes)
  }
</script>

<Dialog label={recruit.string.CreateCandidate} 
        okLabel={recruit.string.CreateCandidate} 
        okAction={save}
        on:close={() => { dispatch('close') }}>
  <DialogHeader />
  <Tabs/>
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
  <Section icon={IconComments} label={'Comments'}>
    <CommentViewer />
    <div class="reference"><ReferenceInput /></div>
  </Section>
  {#if backlinks && backlinks.length > 0}
  <Section icon={Address} label={'Backlinks'}>
    {#each backlinks as backlink}
      <BacklinkComponent {backlink} />
    {/each}
  </Section>
  {/if}
</Dialog>

<style lang="scss">
  .reference {
    margin-top: 24px;
  }
</style>
