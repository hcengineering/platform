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
  // This component converts all URLs from the provided string or IntlString to Links.

  import { IntlString, translateCB } from '@hcengineering/platform'
  import { themeStore } from '@hcengineering/theme'
  import { replaceURLs } from '../utils'

  export let text: string | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let params: Readonly<Record<string, any>> = {}

  $: if (label) {
    translateCB(label, params, $themeStore.language, (result) => (text = result))
  }
</script>

{#if text}
  <!-- "replaceURLs" produces sanitazed string -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html replaceURLs(text)}
{/if}
