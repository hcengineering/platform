<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import Nodes from './message/Nodes.svelte'

  export let message: string

  let dom: HTMLElement

  const parser = new DOMParser()

  export function isEmpty () {
    return doc.documentElement.innerText.length === 0
  }

  $: doc = parser.parseFromString(message, 'text/html')
  $: dom = doc.firstChild?.childNodes[1] as HTMLElement
</script>

<Nodes nodes={dom.childNodes} />
