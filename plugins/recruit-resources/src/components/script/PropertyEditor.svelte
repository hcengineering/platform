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
  import type { Class, Ref, Type } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import type {
    ScriptAttribute,
    ScriptTypedPropertyEditorComponentProps,
    ScriptTypedPropertyEditorMixin
  } from '@hcengineering/recruit'
  import { Component, Loading } from '@hcengineering/ui'
  import { getScriptTypedPropertyEditorMixin } from '../../utils'

  type T = $$Generic<Type<any>>
  type $$Props = ScriptTypedPropertyEditorComponentProps<T>

  export let attribute: ScriptAttribute<T>

  const hierarchy = getClient().getHierarchy()
  let classRef: Ref<Class<T>> | null = null
  let mixin: ScriptTypedPropertyEditorMixin<T> | undefined = undefined
  $: if (classRef !== attribute.type._class) {
    classRef = attribute.type._class
    mixin = getScriptTypedPropertyEditorMixin(hierarchy, classRef)
  }
</script>

{#if mixin === undefined}
  <Loading />
{:else}
  <Component is={mixin.editor} props={$$props} />
{/if}
