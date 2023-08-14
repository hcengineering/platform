<script lang="ts">
  import { ChunterMessage } from "@hcengineering/chunter"
  import { MessageViewer } from "@hcengineering/presentation"
  import ui, { Label, tooltip } from "@hcengineering/ui"
  import { LinkPresenter } from "@hcengineering/view-resources"
  import { AttachmentList } from '@hcengineering/attachment-resources'
  import { getEmbeddedLabel } from "@hcengineering/platform"
  import { Ref, WithLookup, getCurrentAccount } from "@hcengineering/core"
  import { Attachment } from "@hcengineering/attachment"
  import { EmployeePresenter, personAccountByIdStore, personByIdStore } from "@hcengineering/contact-resources"
  import { PersonAccount } from "@hcengineering/contact"

  export let message: WithLookup<ChunterMessage>

  $: attachments = (message.$lookup?.attachments ?? []) as Attachment[]

  export function isToday (time: number): boolean {
    const current = new Date()
    const target = new Date(time)
    return (
      current.getDate() === target.getDate() &&
      current.getMonth() === target.getMonth() &&
      current.getFullYear() === target.getFullYear()
    )
  }

  export function getTime (time: number): string {
    let options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }
    if (!isToday(time)) {
      options = {
        month: 'numeric',
        day: 'numeric',
        ...options
      }
    }

    return new Date(time).toLocaleString('default', options)
  }

  $: links = getLinks(message.content)

  function getLinks (content: string): HTMLLinkElement[] {
    const parser = new DOMParser()
    const parent = parser.parseFromString(content, 'text/html').firstChild?.childNodes[1] as HTMLElement
    return parseLinks(parent.childNodes)
  }

  function parseLinks (nodes: NodeListOf<ChildNode>): HTMLLinkElement[] {
    const res: HTMLLinkElement[] = []
    nodes.forEach((p) => {
      if (p.nodeType !== Node.TEXT_NODE) {
        if (p.nodeName === 'A') {
          res.push(p as HTMLLinkElement)
        }
        res.push(...parseLinks(p.childNodes))
      }
    })
    return res
  }

  const me = getCurrentAccount()._id as Ref<PersonAccount>

  let account: PersonAccount | undefined

  $: account = $personAccountByIdStore.get(message.createdBy as Ref<PersonAccount>)
  $: employee = account && $personByIdStore.get(account.person)
</script>

<div class="container clear-mins" class:highlighted={false} id={message._id}>
  <!-- <div class="avatar"><Avatar size={'medium'} avatar={employee?.avatar} /></div> -->
  <div class="message clear-mins">
    <div class="flex-row-center header clear-mins">
      {#if employee && account}
        {#if account._id !== me}
          <EmployeePresenter value={employee} shouldShowAvatar={true} disabled />
        {:else}
          <div>You</div>
        {/if}
      {/if}
      <span>{getTime(message.createdOn ?? 0)}</span>
      {#if message.editedOn}
        <span use:tooltip={{ label: ui.string.TimeTooltip, props: { value: getTime(message.editedOn) } }}>
          <Label label={getEmbeddedLabel("Edited")} />
        </span>
      {/if}
    </div>
    <div class="text"><MessageViewer message={message.content} /></div>
    {#if message.attachments}
      <div class="attachments">
        <AttachmentList {attachments} />
      </div>
    {/if}
    {#each links as link}
      <LinkPresenter {link} />
    {/each}
  </div>
</div>

<style lang="scss">
  @keyframes highlight {
    50% {
      background-color: var(--theme-warning-color);
    }
  }
  .container {
    position: relative;
    display: flex;
    flex-shrink: 0;
    padding: 0.5rem 0.15rem;

    &.highlighted {
      animation: highlight 2000ms ease-in-out;
    }

    .message {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin-left: 1rem;

      .header {
        display: flex;
        font-weight: 500;
        line-height: 150%;
        color: var(--theme-caption-color);
        margin-bottom: 0.25rem;

        span {
          margin-left: 0.5rem;
          font-weight: 400;

          line-height: 1.125rem;
          opacity: 0.4;
        }
      }
      .text {
        line-height: 150%;
        user-select: contain;
      }
      .attachments {
        margin-top: 0.25rem;
      }
    }
  }
</style>
