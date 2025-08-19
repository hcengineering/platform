<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { Attachment } from '@hcengineering/communication-types'
  import { Label } from '@hcengineering/ui'
  import { isAppletAttachment, isBlobAttachment } from '@hcengineering/communication-shared'
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import communication from '@hcengineering/communication'

  export let attachment: Attachment
  export let lower: boolean = false

  const client = getClient()
  const applets = client.getModel().findAllSync(communication.class.Applet, {})
</script>

{#if isBlobAttachment(attachment)}
  {attachment.params.fileName}
{/if}

{#if isAppletAttachment(attachment)}
  {@const applet = applets.find((it) => it.type === attachment.type)}
  {#if applet}
    <span class:lower>
      <Label label={applet.label} />:
    </span>
    {#await getResource(applet.getTitleFn) then fn}
      {fn(attachment)}
    {/await}
  {/if}
{/if}
