<!--
//
// Copyright © 2022 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { Document } from '@hcengineering/document'
  import { Button, Icon, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import { BuildModelKey } from '@hcengineering/view'
  import { Table } from '@hcengineering/view-resources'
  import document from '../plugin'
  import CreateDocumentVersion from './CreateDocumentVersion.svelte'

  export let object: Document

  const createApp = (ev: MouseEvent): void => {
    showPopup(CreateDocumentVersion, { object }, 'top')
  }
  const config: (BuildModelKey | string)[] = ['version', 'sequenceNumber', 'approved']
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <div class="antiSection-header__icon">
      <Icon icon={document.icon.Document} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <Label label={document.string.Versions} />
    </span>
    <Button id="appls.add" icon={IconAdd} kind={'transparent'} shape={'circle'} on:click={createApp} />
  </div>
  {#if object.versions > 0}
    <Table
      _class={document.class.DocumentVersion}
      {config}
      query={{ attachedTo: object._id }}
      loadingProps={{ length: object.versions }}
    />
  {:else}
    <div class="antiSection-empty solid flex-col-center mt-3">
      <span class="dark-color">
        <Label label={document.string.NoVersions} />
      </span>
      <span class="over-underline content-accent-color" on:click={createApp}>
        <Label label={document.string.CreateAnVersion} />
      </span>
    </div>
  {/if}
</div>
