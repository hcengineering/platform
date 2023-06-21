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

  import { IntlString, translate } from '@hcengineering/platform'
  import { replaceURLs } from '../utils'
  import { themeStore } from '@hcengineering/theme'

  export let text: string | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let params: Readonly<Record<string, any>> = {}

  $: label && translate(label, params, $themeStore.language).then((result) => (text = result))
</script>

{#if text}
  <!-- "replaceURLs" produces sanitazed string -->
  {@html replaceURLs(text)}
{/if}
