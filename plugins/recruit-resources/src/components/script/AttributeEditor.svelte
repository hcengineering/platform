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
  import type { Class, PropertyType, Ref, Type } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import type { ScriptAttribute } from '@hcengineering/recruit'
  import { Component, Loading } from '@hcengineering/ui'
  import type { ScriptTypedAttributeEditorComponentProps, ScriptTypedAttributeEditorMixin } from '../../types'
  import { getScriptTypedAttributeEditorMixin } from '../../utils'

  type P = $$Generic<PropertyType>
  type $$Props = ScriptTypedAttributeEditorComponentProps<Type<P>>

  export let object: ScriptAttribute<P>

  const hierarchy = getClient().getHierarchy()
  let classRef: Ref<Class<Type<P>>> | null = null
  let mixin: ScriptTypedAttributeEditorMixin<Type<P>> | undefined = undefined
  $: if (classRef !== object.type._class) {
    classRef = object.type._class
    mixin = getScriptTypedAttributeEditorMixin(hierarchy, classRef)
  }
</script>

{#if mixin === undefined}
  <Loading />
{:else}
  <Component is={mixin.editor} props={$$props} />
{/if}
