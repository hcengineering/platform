<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { AttributeModel } from '@hcengineering/view'
  import { ActivityUpdate, ActivityUpdateType } from '@hcengineering/communication-types'

  import ActivityUpdateTagViewer from './ActivityUpdateTagViewer.svelte'
  import ActivityUpdateAttributeViewer from './ActivityUpdateAttributeViewer.svelte'

  export let model: AttributeModel | undefined = undefined
  export let update: ActivityUpdate
</script>

{#if update.type === ActivityUpdateType.Attribute && model}
  <ActivityUpdateAttributeViewer {model} {update} />
{:else if update.type === ActivityUpdateType.Tag}
  <ActivityUpdateTagViewer {update} />
{/if}
