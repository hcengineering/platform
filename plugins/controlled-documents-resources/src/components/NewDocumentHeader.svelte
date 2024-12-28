<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Button, ButtonWithDropdown, IconAdd, IconDropdown, SelectPopupValueType, showPopup } from '@hcengineering/ui'
  import { checkMyPermission, permissionsStore } from '@hcengineering/contact-resources'

  import documents from '../plugin'
  import CreateDocumentCategory from './CreateDocumentCategory.svelte'

  let dropdownItems: SelectPopupValueType[] = []
  $: canCreateTemplate = checkMyPermission(
    documents.permission.CreateDocument,
    documents.space.QualityDocuments,
    $permissionsStore
  )
  $: canCreateCategory = checkMyPermission(
    documents.permission.CreateDocumentCategory,
    documents.space.QualityDocuments,
    $permissionsStore
  )
  $: {
    dropdownItems = []
    if (canCreateTemplate) {
      dropdownItems.push({
        id: documents.string.DocumentTemplate,
        label: documents.string.NewDocumentTemplate
      })
    }

    if (canCreateCategory) {
      dropdownItems.push({
        id: documents.string.Category,
        label: documents.string.NewDocumentCategory
      })
    }
  }

  function newDocument (): void {
    showPopup(documents.component.QmsDocumentWizard, { _class: documents.class.ControlledDocument })
  }

  function dropdownItemSelected (res?: SelectPopupValueType['id']): void {
    if (res == null) return

    if (res === documents.string.DocumentTemplate) {
      showPopup(documents.component.QmsTemplateWizard, { _class: documents.class.ControlledDocument })
    } else {
      showPopup(CreateDocumentCategory, {})
    }
  }
</script>

<div class="antiNav-subheader">
  {#if dropdownItems.length > 0}
    <ButtonWithDropdown
      icon={IconAdd}
      justify="left"
      kind="primary"
      label={documents.string.NewDocument}
      dropdownIcon={IconDropdown}
      {dropdownItems}
      on:click={newDocument}
      on:dropdown-selected={(ev) => {
        dropdownItemSelected(ev.detail)
      }}
    />
  {:else}
    <Button
      icon={IconAdd}
      justify="left"
      kind="primary"
      label={documents.string.NewDocument}
      width="100%"
      on:click={newDocument}
    />
  {/if}
</div>
