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
  import { translate } from '@hcengineering/platform'
  import type { ScriptAttribute } from '@hcengineering/recruit'
  import { themeStore } from '@hcengineering/theme'
  import Textarea from './Textarea.svelte'
  import recruit from '../../plugin'

  export let title: ScriptAttribute['title']
  export let readonly: boolean

  let input: Textarea
  export function focus (): void {
    input.focus()
  }

  let placeholder: string = ''
  $: {
    void translate(recruit.string.ScriptAttributeTitle, {}, $themeStore.language).then((result) => {
      placeholder = result
    })
  }
</script>

<Textarea {placeholder} bind:this={input} disabled={readonly} value={title ?? ''} on:change />
