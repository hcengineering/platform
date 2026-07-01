<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { Card } from '@hcengineering/presentation'
  import { Button, Label } from '@hcengineering/ui'
  import slack from '../plugin'
  import IconSlack from './icons/Slack.svelte'

  const dispatch = createEventDispatcher()

  const serviceUrl = getMetadata(slack.metadata.ServiceUrl) ?? ''

  function connect (): void {
    if (serviceUrl === '') return
    // Opens the Slack OAuth install flow served by the pod-slack service.
    window.open(`${serviceUrl.replace(/\/$/, '')}/slack/install`, '_blank', 'noopener')
    dispatch('close')
  }
</script>

<Card
  label={slack.string.Configure}
  okAction={async () => {
    dispatch('close')
  }}
  canSave={false}
  fullSize
  okLabel={presentation.string.Ok}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <svelte:fragment slot="title">
    <div class="flex-row-center gap-2">
      <IconSlack size="medium" />
      <span class="text-normal">
        <Label label={slack.string.Configure} />
      </span>
    </div>
  </svelte:fragment>
  <div class="flex-col min-w-100 flex-gap-4 p-4">
    <span>
      Connect this workspace to Slack. After authorizing, messages create Huly
      tasks automatically, the bot reacts with eyes to messages, and mentioning
      “huly” in a thread creates a task for the message above.
    </span>
    {#if serviceUrl !== ''}
      <div class="flex">
        <Button label={slack.string.Connect} kind={'primary'} on:click={connect} />
      </div>
    {:else}
      <span class="content-dark-color">
        The Slack service URL isn’t configured yet. Set <b>SLACK_SERVICE_URL</b> in the
        front config, then reconnect — or open <b>&lt;service-url&gt;/slack/install</b> directly.
      </span>
    {/if}
  </div>
</Card>
