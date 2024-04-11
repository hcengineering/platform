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
  import type { Type } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import type { ScriptAttribute } from '@hcengineering/recruit'
  import { themeStore } from '@hcengineering/theme'
  import recruit from '../../plugin'
  import type { ScriptTypedAttributeEditorComponentProps } from '../../types'
  import Textarea from './Textarea.svelte'

  type P = $$Generic<string>
  type $$Props = ScriptTypedAttributeEditorComponentProps<Type<P>>

  export let object: ScriptAttribute<P>
  export let readonly: boolean

  let placeholder: string = ''
  $: {
    void translate(recruit.string.ScriptAttributeDefaultValue, {}, $themeStore.language).then((result) => {
      placeholder = result
    })
  }

  const client = getClient()
</script>

<Textarea
  {placeholder}
  disabled={readonly}
  value={object.defaultValue ?? ''}
  on:change={(event) => {
    if (!readonly) {
      void client.update(object, { defaultValue: event.detail })
    }
  }}
/>
