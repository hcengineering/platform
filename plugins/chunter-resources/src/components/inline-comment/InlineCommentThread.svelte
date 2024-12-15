<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import InlineCommentPresenter from './InlineCommentPresenter.svelte'
  import textEditor from '@hcengineering/text-editor'
  import { ReferenceInput } from '@hcengineering/text-editor-resources'
  import { Action, Scroller, IconCheck, AnySvelteComponent } from '@hcengineering/ui'
  import chunter from '../../plugin'

  export let thread: any
  export let autofocus: boolean
  export let collapsed: boolean = false
  export let width: number = 350
  export let highlighted = false

  export let handleSubmit: ((text: string, _id?: string) => void) | undefined = undefined
  export let handleResolveThread: (() => void) | undefined = undefined

  let headCommentActions: Action[] = []

  $: headCommentActions =
    handleResolveThread !== undefined
      ? [
          {
            label: chunter.string.ResolveThread,
            icon: IconCheck as AnySvelteComponent,
            group: 'inline-comment',
            inline: true,
            action: async () => {
              handleResolveThread()
            }
          }
        ]
      : []

  async function handleSubmitEvent (event: CustomEvent<string>): Promise<void> {
    handleSubmit?.(event.detail)
  }
</script>

<div class="comment-thread" style:width={`${width}px`} class:collapsed class:highlighted>
  <Scroller maxHeight={30} scrollDirection="vertical" disableOverscroll disablePointerEventsOnScroll>
    {#each thread.messages as message, index (message._id)}
      <InlineCommentPresenter
        value={message}
        skipLabel={false}
        hoverStyles="none"
        type="default"
        withShowMore={true}
        isHighlighted={false}
        shouldScroll={false}
        actions={index === 0 ? headCommentActions : []}
        {handleSubmit}
      />
    {/each}
  </Scroller>
  <div class="comment-input">
    <ReferenceInput
      kindSend="primary"
      placeholder={textEditor.string.AddCommentPlaceholder}
      noborder
      {autofocus}
      on:message={handleSubmitEvent}
    />
  </div>
</div>

<style lang="scss">
  .comment-thread {
    --comment-thread-background-color: var(--theme-comp-header-color);
    --comment-thread-border: 1px solid var(--theme-button-border);
    --comment-thread-box-shadow: var(--button-shadow);

    position: relative;
    max-width: 100%;
    background-color: var(--comment-thread-background-color);
    border-radius: 0.5rem;
    box-shadow: var(--comment-thread-box-shadow);
    z-index: 1;

    transition-property: transform, background-color;
    transition-duration: 150ms;
    transition-timing-function: ease-out;
  }

  .comment-thread.collapsed {
    background-color: transparent;
    border: var(--comment-thread-border);
    box-shadow: none;
    transform: translateX(1rem);

    &.highlighted {
      transform: translateX(0.5rem);
      background-color: var(--comment-thread-background-color);
      transition-delay: 150ms;
    }
  }

  .comment-thread.collapsed .comment-input {
    display: none;
  }
</style>
