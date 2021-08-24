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

import type { Doc, Ref, Space } from '@anticrm/core'
import type { Comment } from '@anticrm/chunter'
import { ReferenceInput } from '@anticrm/text-editor'
import { createQuery, getClient } from '@anticrm/presentation'
import { ScrollBox, IconComments, Grid } from '@anticrm/ui'

import Bookmark from './icons/Bookmark.svelte'
import Backlink from './Backlink.svelte'

import chunter from '@anticrm/chunter'

export let object: Doc
export let space: Ref<Space>
  
let comments: Comment[]

const client = getClient()
const query = createQuery()
$: query.query(chunter.class.Comment, { objectId: object._id }, result => { comments = result })

function onMessage(event: CustomEvent) {
  client.createDoc(chunter.class.Comment, space, {
    objectId: object._id,
    message: event.detail
  })
  console.log(event.detail)
}
</script>

<div class="container">
  <div class="msg-board">
    <ScrollBox vertical stretch noShift>
      {#if comments}
        <Grid column={1} rowGap={1.5}>
          {#each comments as comment}
            <Backlink {comment} />
          {/each}
        </Grid>
      {/if}
    </ScrollBox>
  </div>
  <ReferenceInput on:message={onMessage}/>
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;

    .msg-board {
      margin-bottom: 1.5em;
      min-height: 2rem;
      height: 100%;
    }
  }
</style>
