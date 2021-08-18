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

import type { Doc } from '@anticrm/core'
import { Backlink as BacklinkComponent } from '@anticrm/presentation'
import type { Backlink } from '@anticrm/chunter'
import { ReferenceInput } from '@anticrm/text-editor'
import { createQuery } from '@anticrm/presentation'
import { Section, IconComments } from '@anticrm/ui'

import Bookmark from './icons/Bookmark.svelte'
import CommentViewer from './CommentViewer.svelte'

import chunter from '@anticrm/chunter'

export let object: Doc
  
let backlinks: Backlink[]

const query = createQuery()
$: query.query(chunter.class.Backlink, { objectId: object._id }, result => { backlinks = result })
  
</script>

<Section icon={IconComments} label={'Comments'}>
  <CommentViewer />
  <div class="reference"><ReferenceInput /></div>
</Section>
{#if backlinks && backlinks.length > 0}
<Section icon={Bookmark} label={'Backlinks'}>
  {#each backlinks as backlink}
    <BacklinkComponent {backlink} />
  {/each}
</Section>
{/if}

<style lang="scss">
  .reference {
    margin-top: 24px;
  }
</style>

