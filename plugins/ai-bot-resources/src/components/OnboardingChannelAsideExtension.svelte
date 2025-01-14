<script lang="ts">
  import { ModernButton } from '@hcengineering/ui'
  import aiBot, { OnboardingEvent, type OnboardingEventRequest, OpenChatInSidebarData } from '@hcengineering/ai-bot'
  import { getMetadata } from '@hcengineering/platform'
  import { concatLink } from '@hcengineering/core'
  import presentation from '@hcengineering/presentation'
  import { OnboardingChannel } from '@hcengineering/analytics-collector'
  import chunter from '@hcengineering/chunter'

  export let object: OnboardingChannel

  async function handleClick (): Promise<void> {
    const url = getMetadata(aiBot.metadata.EndpointURL) ?? ''
    const token = getMetadata(presentation.metadata.Token) ?? ''

    if (url === '' || token === '') {
      return undefined
    }

    try {
      const req: OnboardingEventRequest<OpenChatInSidebarData> = {
        event: OnboardingEvent.OpenChatInSidebar,
        data: {
          personId: object.socialString,
          workspace: object.workspaceId
        }
      }
      await fetch(concatLink(url, '/onboarding'), {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req)
      })
    } catch (error) {
      console.error(error)
      return undefined
    }
  }
</script>

<div class="root">
  <ModernButton label={chunter.string.OpenChatInSidebar} size="small" on:click={handleClick} />
</div>

<style lang="scss">
  .root {
    padding: var(--spacing-1) var(--spacing-2);
  }
</style>
