<!--
// Copyright © 2024 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import { type Blob, type Ref } from '@hcengineering/core'
  import presentation, { getPrintContext } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import AudioPlayer from './AudioPlayer.svelte'

  export let value: Ref<Blob>
  export let name: string
  export let contentType: string
  export let sourceLink: string | undefined = undefined
  const printing = getPrintContext() !== undefined
</script>

{#if printing}
  <Label label={presentation.string.ContentTypeNotSupported} />:
  {#if sourceLink !== undefined}<a href={sourceLink}>{name}</a>{:else}{name}{/if}
{:else}
  <AudioPlayer {value} {name} {contentType} fullSize={true} />
{/if}
