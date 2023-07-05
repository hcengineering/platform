<!--
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
-->
<script lang="ts">
  import { Button, showPopup, IconAdd } from '@hcengineering/ui'
  import document from '../plugin'
  import CreateDocument from './CreateDocument.svelte'

  async function newDocument (): Promise<void> {
    showPopup(CreateDocument, {}, 'top')
  }
</script>

<div class="antiNav-subheader">
  <Button
    icon={IconAdd}
    label={document.string.CreateDocument}
    justify={'left'}
    width={'100%'}
    kind={'accented'}
    size={'large'}
    on:click={newDocument}
  />
</div>
