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

  import type { Doc } from '@anticrm/core'
  import { Button, showPopup } from '@anticrm/ui'
  import CreateApplication from './CreateApplication.svelte'

  export let object: Doc

  let button: HTMLElement

</script>

<div bind:this={button}><Button label="Create Application" size="small" on:click={ () => { showPopup(CreateApplication, { candidate: object._id }, button) } }/></div>
