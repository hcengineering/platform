<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher } from 'svelte'

  import documents, {
    Document,
    DocumentState,
    copyProjectDocuments,
    deleteProjectDrafts
  } from '@hcengineering/controlled-documents'
  import { Product, ProductVersion, ProductVersionState } from '@hcengineering/products'
  import { Data, Ref, SortingOrder, generateId } from '@hcengineering/core'
  import { Card, MessageBox, SpaceSelector, createQuery, getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor-resources'
  import { DropdownLabelsIntl, EditBox, FocusHandler, createFocusManager, showPopup } from '@hcengineering/ui'
  import { ObjectBox } from '@hcengineering/view-resources'

  import products from '../../plugin'

  type Severity = 'major' | 'minor'
  type ProductVersionDraft = Omit<Data<ProductVersion>, 'parent' | 'name'>

  export let space: Ref<Product> | undefined

  const dispatch = createEventDispatcher()
  const client = getClient()
  const query = createQuery()
  const manager = createFocusManager()

  const id: Ref<ProductVersion> = generateId()

  let object: Omit<Data<ProductVersion>, 'parent' | 'name'> = createDefaultObject()
  let excludedChangeControl: Array<Ref<Document>> = []

  let parent: ProductVersion | null | undefined
  let severity: Severity = 'minor'

  $: query.query(
    products.class.ProductVersion,
    {
      space
    },
    (res) => {
      parent = res[0] ?? null
      excludedChangeControl = res.map((p) => p.changeControl).filter((p) => p !== undefined)
    },
    {
      sort: {
        createdOn: SortingOrder.Descending
      }
    }
  )

  $: updateSeverity(parent, severity)

  function updateSeverity (parent: ProductVersion | undefined, severity: Severity): void {
    if (parent != null) {
      object.major = severity === 'major' ? parent.major + 1 : parent.major
      object.minor = severity === 'minor' ? parent.minor + 1 : 0
    } else {
      object.major = 1
      object.minor = 0
    }
  }

  function formatProductVersion (object: ProductVersionDraft): string {
    return `${object.major}.${object.minor}`
  }

  function formatProductVersionName (object: ProductVersionDraft): string {
    return `${formatProductVersion(object)}` + (object.codename != null ? ` ${object.codename}` : '')
  }

  async function handleOkAction (): Promise<void> {
    if (space === undefined) {
      return
    }

    const ops = client.apply()

    const version = {
      ...object,
      parent: parent?._id ?? products.ids.NoParentVersion,
      name: formatProductVersionName(object)
    }

    if (version.parent !== products.ids.NoParentVersion && version.parent !== undefined) {
      await ops.updateDoc(products.class.ProductVersion, space, version.parent, {
        readonly: true,
        state: ProductVersionState.Released
      })
    }

    await ops.createDoc(products.class.ProductVersion, space, version, id)
    await deleteProjectDrafts(ops, version.parent)
    await copyProjectDocuments(ops, version.parent, id)

    await ops.commit()

    object = createDefaultObject()
    dispatch('close', id)
  }

  async function handleClose (): Promise<void> {
    const noChanges = deepEqual(object, createDefaultObject())
    if (noChanges) {
      dispatch('close')
    } else {
      showPopup(
        MessageBox,
        {
          label: products.string.CreateDialogClose,
          message: products.string.CreateDialogCloseNote
        },
        'top',
        (result?: boolean) => {
          if (result === true) {
            dispatch('close')
          }
        }
      )
    }
  }

  function createDefaultObject (): ProductVersionDraft {
    return {
      readonly: false,
      major: 1,
      minor: 0,
      codename: '',
      description: '',
      state: ProductVersionState.Active
    }
  }

  $: canSave =
    space !== undefined &&
    parent !== undefined &&
    object.major !== undefined &&
    object.major >= 0 &&
    object.minor !== undefined &&
    object.minor >= 0 &&
    (parent == null || object.changeControl !== undefined)
</script>

<FocusHandler {manager} />

<Card
  label={products.string.CreateProductVersion}
  okAction={handleOkAction}
  {canSave}
  on:close={handleClose}
  hideAttachments
>
  <svelte:fragment slot="header">
    <SpaceSelector
      bind:space
      _class={products.class.Product}
      label={products.string.Product}
      kind={'regular'}
      size={'small'}
    />
    <!-- TODO this object selector sometimes shows wrong value -->
    <ObjectBox
      _class={products.class.ProductVersion}
      value={parent?._id}
      docQuery={{ space }}
      readonly={true}
      kind={'regular'}
      size={'small'}
      label={products.string.NoProductVersionParent}
      icon={products.icon.ProductVersion}
      showNavigate={false}
      showTooltip={{ label: products.string.ProductVersionParent }}
    />
  </svelte:fragment>

  <div class="flex-row-center flex-gap-3">
    <div class="heading-medium-20">
      {formatProductVersion(object)}
    </div>
    <EditBox placeholder={products.string.Codename} bind:value={object.codename} kind="large-style" focusIndex={3} />
  </div>

  <div class="flex-row-center flex-gap-3 clear-mins">
    <div class="flex-grow flex-col">
      <StyledTextBox
        bind:content={object.description}
        placeholder={products.string.ProductVersionDescriptionPlaceholder}
        kind={'normal'}
        focusIndex={10}
        showButtons={false}
        alwaysEdit
      />
    </div>
  </div>

  <svelte:fragment slot="pool">
    {#if parent}
      <DropdownLabelsIntl
        label={products.string.ChangeSeverity}
        items={[
          { id: 'minor', label: products.string.Minor },
          { id: 'major', label: products.string.Major }
        ]}
        bind:selected={severity}
      />
      <ObjectBox
        bind:value={object.changeControl}
        _class={documents.class.Document}
        docQuery={{
          space,
          // TODO Use more robust category id
          category: 'documents:category:DOC - CC',
          state: DocumentState.Effective
        }}
        docProps={{
          withTitle: true,
          isRegular: true,
          disableLink: true
        }}
        excluded={excludedChangeControl}
        kind={'regular'}
        size={'small'}
        label={products.string.ChangeControl}
        showNavigate={false}
      />
    {/if}
  </svelte:fragment>
</Card>
