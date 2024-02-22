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
  import { Button, IconFile, showPopup, closePopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { parseVCard } from '../utils'
  import PhoneContactCard from './PhoneContactCard.svelte'
  const dispatch = createEventDispatcher()

  let inputFile: HTMLInputElement

  async function fileSelected () {
    const files = inputFile.files
    if (files === null || files.length === 0) {
      return
    }
    try {
      for (const file of Array.from(files)) {
        const content = await parseVCard(file)
        closePopup()
        showPopup(PhoneContactCard, { data: content }, 'top')
      }
    } catch (e) {
      console.error(e)
    }
    inputFile.value = ''
    dispatch('attached')
  }
  function openFile () {
    inputFile.click()
  }
</script>

<div>
  <Button icon={IconFile} kind={'ghost'} on:click={openFile} />
  <input
    bind:this={inputFile}
    type="file"
    accept=".vcf,.vcr"
    multiple
    style="display: none"
    on:change={fileSelected}
  />
</div>
