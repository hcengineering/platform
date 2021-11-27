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
  import { Button, CircleButton, IconClose } from '@anticrm/ui'
  import Avatar from './Avatar.svelte'
  import ArrowLeft from './icons/ArrowLeft.svelte'
  import ExpandUp from './icons/ExpandUp.svelte'
  import ExpandDown from './icons/ExpandDown.svelte'

  import { getFileUrl } from '../utils'
  import { IntlString } from '@anticrm/platform'

  export let file: string

  const downloadLabel = 'Download' as IntlString
  const deleteLabel = 'Delete' as IntlString
</script>

<div class="pdfviewer-container">
  <div class="flex-between header">
    <div class="flex-center arrow-back">
      <div class="icon"><ArrowLeft size={'small'} /></div>
    </div>
    <div class="flex-row-center flex-grow">
      <Avatar size={'medium'} />
      <div class="flex-col user">
        <div class="overflow-label name">Grace Osaka</div>
        <div class="overflow-label description">Candidate</div>
      </div>
    </div>
    <div class="flex-row-center">
      <div class="tool"><IconClose size={'small'} /></div>
    </div>
  </div>

  <iframe title="" class="flex-grow content" src={getFileUrl(file)} />

  <div class="flex-between footer">
    <div class="flex-row-reverse">
      <Button label={downloadLabel} primary />
      <Button label={deleteLabel} />
    </div>
    <div class="flex-row-center">
      <CircleButton icon={ExpandDown} />
      <CircleButton icon={ExpandUp} />
    </div>
  </div>
</div>

<style lang="scss">
  .pdfviewer-container {
    display: flex;
    flex-direction: column;
    width: 45rem;
    height: 100%;
    background-color: #f2f2f2;
    border-radius: 1.25rem 1.875rem 1.875rem 1.25rem;

    .header {
      margin: 0 2rem 0 2.25rem;
      height: 4.5rem;
      min-height: 4.5rem;

      .arrow-back {
        margin-right: 1rem;
        width: 1.5rem;
        height: 1.5rem;
        cursor: pointer;
        .icon {
          color: #1f212b;
          opacity: 0.4;
        }
        &:hover .icon {
          opacity: 1;
        }
      }

      .user {
        margin-left: 0.75rem;
      }
      .name {
        font-weight: 500;
        font-size: 1rem;
        color: black;
      }
      .description {
        font-size: 0.75rem;
        color: #1f212b;
        opacity: 0.6;
      }
      .tool {
        margin-left: 0.75rem;
        opacity: 0.4;
        cursor: pointer;
        &:hover {
          opacity: 1;
        }
      }
    }

    .content {
      margin: 0 0.75rem;
      background-color: #fff;
      border: 1px solid var(--theme-bg-accent-color);
      border-radius: 0.72rem;
    }

    .footer {
      flex-direction: row-reverse;
      margin: 0 2.5rem 0 1.75rem;
      height: 6rem;
      min-height: 6rem;
      color: #1f212b;

      :global(button + button) {
        margin-right: 1rem;
      }
      :global(.icon-button + .icon-button) {
        margin-left: 0.5rem;
      }
    }
  }
</style>
