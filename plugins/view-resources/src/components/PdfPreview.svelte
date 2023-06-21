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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import view, { PdfPreviewPresenter } from '@hcengineering/view'
  import { AnyComponent, Button, Component, IconClose, Loading } from '@hcengineering/ui'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { createEventDispatcher, onMount } from 'svelte'

  export let _id: Ref<Doc>
  export let _class: Ref<Class<Doc>>

  const objectQuery = createQuery()
  const hierarchy = getClient().getHierarchy()
  const dispatch = createEventDispatcher()

  let object: Doc | undefined
  let isObjectLoading = true

  let pdfPreviewPresenterMixin: PdfPreviewPresenter | undefined
  let pdfPreviewPresenter: AnyComponent | undefined
  let keys: string[] | undefined = undefined
  let ignoreKeys: string[] | undefined = undefined

  $: pdfPreviewPresenterMixin = hierarchy.classHierarchyMixin(_class, view.mixin.PdfPreviewPresenter)
  $: if (pdfPreviewPresenterMixin) {
    pdfPreviewPresenter = pdfPreviewPresenterMixin.presenter
    keys = pdfPreviewPresenterMixin.keys
    ignoreKeys = pdfPreviewPresenterMixin.ignoreKeys
  }
  $: (pdfPreviewPresenterMixin &&
    objectQuery.query(_class, { _id }, (objects) => {
      ;[object] = objects
      isObjectLoading = false
    })) ||
    objectQuery.unsubscribe()

  onMount(() => dispatch('open'))
</script>

<div class="flex-col flex-gap-3 h-full overflow-y-auto">
  <div class="print-hidden self-end absolute">
    <Button icon={IconClose} iconSize="medium" kind="transparent" on:click={() => dispatch('close')} />
  </div>
  {#if pdfPreviewPresenter}
    <div class="content">
      {#if isObjectLoading}
        <Loading />
      {:else if object}
        <Component is={pdfPreviewPresenter} props={{ object, keys, ignoreKeys }} />
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .content {
    padding: 2rem 4rem;
  }

  .self-end {
    align-self: end;
  }

  .print-hidden {
    @media print {
      display: none;
    }
  }
</style>
