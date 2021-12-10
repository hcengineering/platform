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
  import type { Candidate } from '@anticrm/recruit'
  import { Label, Button } from '@anticrm/ui'
  import { getClient } from '@anticrm/presentation'

  import recruit from '../plugin'
  import { Ref, Space } from '@anticrm/core'
  import { SpaceSelect } from '@anticrm/presentation'
  import { createEventDispatcher } from 'svelte'
  import chunter from '@anticrm/chunter'
  import attachment from '@anticrm/attachment'
  import ui from '@anticrm/ui'

  export let candidate: Candidate
  let space: Ref<Space> = candidate.space
  const client = getClient()
  const dispatch = createEventDispatcher()

  async function move (): Promise<void> {
    client.updateDoc(candidate._class, candidate.space, candidate._id, {
      space: space
    })
    client
      .findAll(chunter.class.Comment, {
        attachedTo: candidate._id,
        space: candidate.space
      })
      .then((comments) =>
        comments.forEach((comment) => {
          client.updateDoc(comment._class, comment.space, comment._id, {
            space: space
          })
        })
      )
    client
      .findAll(attachment.class.Attachment, {
        attachedTo: candidate._id,
        space: candidate.space
      })
      .then((attachments) =>
        attachments.forEach((attachment) => {
          client.updateDoc(attachment._class, attachment.space, attachment._id, {
            space: space
          })
        })
      )

    dispatch('close')
  }
</script>

<div class="container">
  <div class="header fs-title">
    <Label label="Move candidate" />
  </div>
  <div class="description">
    <Label label="Select the pool you want to move candidate to." />
  </div>
  <SpaceSelect _class={recruit.class.Candidates} label="Candidate’s pool" bind:value={space} />
  <div class="footer">
    <Button label="Move" disabled={space === candidate.space} primary on:click={move} />
    <Button
      label={ui.string.Cancel}
      on:click={() => {
        dispatch('close')
      }}
    />
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    background-color: var(--theme-bg-color);
    border-radius: 1.25rem;
    padding: 2rem 1.75rem 1.75rem 1.75rem;

    .description {
      margin: 1rem 0;
    }

    .footer {
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: start;
      align-items: center;
      margin-top: 1rem;
      column-gap: 0.75rem;
      mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0) 1.25rem, rgba(0, 0, 0, 1) 2.5rem);
      overflow: hidden;
    }
  }
</style>
