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
  import {
    CheckBox,
    Label,
    Modal,
    ModernEditbox,
    ModernToggle,
    IconClose,
    ButtonIcon,
    showPopup,
    DateTimePresenter
  } from '@hcengineering/ui'
  import { Applet } from '@hcengineering/communication'
  import presentation from '@hcengineering/presentation'
  import { createEventDispatcher } from 'svelte'
  import { IntlString } from '@hcengineering/platform'
  import { generateId } from '@hcengineering/core'
  import emoji from '@hcengineering/emoji'

  import communication from '../../plugin'

  import { getEmptyPollConfig, PollConfig, PollOption } from '../../poll'
  export let applet: Applet
  export let params: PollConfig = getEmptyPollConfig()

  const dispatch = createEventDispatcher()

  const optionElements: Record<number, HTMLInputElement> = {}
  let questionElement: HTMLInputElement | undefined = undefined

  $: updateOptions(params.options)

  function getErrorMessage (params: PollConfig): IntlString | undefined {
    if (params.question.trim() === '') return communication.string.QuestionIsRequired
    if (params.options.filter((it) => it.label.trim() !== '').length === 0) return communication.string.OptionIsRequired
    if (params.quiz === true && params.quizAnswer == null) return communication.string.AnswerIsRequired
    if (params.startAt != null && params.startAt < Date.now()) return communication.string.StartDateMustBeInTheFuture
    if (params.endAt != null && params.endAt < Date.now()) return communication.string.EndDateMustBeInTheFuture
    return undefined
  }

  function canSave (params: PollConfig): boolean {
    if (params.question.trim() === '') return false
    if (params.options.filter((it) => it.label.trim() !== '').length === 0) return false
    if (params.quiz === true && params.quizAnswer == null) return false
    if (params.startAt != null && params.startAt < Date.now()) return false
    if (params.endAt != null && params.endAt < Date.now()) return false
    return true
  }

  function okAction (): void {
    const saveConfig = {
      ...params,
      options: params.options.filter((it) => it.label.trim() !== '')
    }

    if (saveConfig.options.length === 0 || saveConfig.question.trim() === '') {
      return
    }

    dispatch('close', saveConfig)
  }

  function handleCancel (): void {
    dispatch('close')
  }

  function updateOptions (options: PollOption[]): void {
    const lastOption = options[options.length - 1]
    const prevOption = options[options.length - 2]

    if (lastOption.label.trim() !== '') {
      params = {
        ...params,
        options: [...options, { id: generateId(), label: '' }]
      }
    } else if (
      lastOption != null &&
      prevOption != null &&
      lastOption.label.trim() === '' &&
      prevOption.label.trim() === ''
    ) {
      params = {
        ...params,
        options: options.slice(0, -1)
      }
    }
  }

  function handleKeydown (e: KeyboardEvent, option?: PollOption): void {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()

      if (option == null) {
        optionElements[0]?.focus()
      } else {
        const currentIndex = params.options.indexOf(option)
        if (currentIndex === -1) return
        if (currentIndex === params.options.length - 1) return
        optionElements[currentIndex + 1]?.focus()
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      if (option == null) return
      const currentIndex = params.options.indexOf(option)
      if (currentIndex === -1) return
      if (currentIndex === 0) {
        questionElement?.focus()
      } else {
        optionElements[currentIndex - 1]?.focus()
      }
    } else if (e.key === 'Backspace') {
      if (option == null || option.label.length > 0) return
      const currentIndex = params.options.indexOf(option)
      if (currentIndex === -1) return
      if (currentIndex === 0 && questionElement != null) {
        e.preventDefault()
        e.stopPropagation()
        questionElement.focus()
      } else if (optionElements[currentIndex - 1] != null) {
        e.preventDefault()
        e.stopPropagation()
        optionElements[currentIndex - 1].focus()
      }
    }
  }

  function removeOption (option: PollOption): void {
    if (params.options.length === 1) return
    const index = params.options.indexOf(option)
    if (index === -1) return
    params = {
      ...params,
      options: params.options.filter((it) => it !== option)
    }
  }
  function showEmojiPicker (evt: MouseEvent, optionId: string): void {
    showPopup(
      emoji.component.EmojiPopup,
      {},
      evt?.target as HTMLElement,
      async (result) => {
        const emoji = result?.text
        if (emoji == null) return

        const option = params.options.find((it) => it.id === optionId)

        if (option != null) {
          params = {
            ...params,
            options: params.options.map((it) => {
              if (it.id === optionId) {
                return { ...it, label: it.label + emoji }
              }
              return it
            })
          }
        }
      },
      () => {}
    )
  }
</script>

<Modal
  label={applet.createLabel}
  type="type-popup"
  width="large"
  okLabel={presentation.string.Create}
  {okAction}
  canSave={canSave(params)}
  onCancel={handleCancel}
  okTooltip={{ label: getErrorMessage(params) }}
  on:close
>
  <div class="poll">
    <div class="poll__setting-item">
      <span class="label"><Label label={communication.string.Question} /></span>
      <ModernEditbox
        bind:value={params.question}
        bind:element={questionElement}
        label={communication.string.AskQuestion}
        size="medium"
        kind="default"
        width="100%"
        autoFocus
        on:keydown={handleKeydown}
      />
    </div>

    <div class="poll__setting-item">
      <span class="label"><Label label={communication.string.PollOptions} /></span>
      {#each params.options as option, i}
        <ModernEditbox
          bind:value={option.label}
          bind:element={optionElements[i]}
          autoAction={false}
          label={communication.string.Option}
          size="medium"
          kind="default"
          width="100%"
          on:keydown={(e) => {
            handleKeydown(e, option)
          }}
        >
          {#if params.quiz === true}
            <CheckBox
              checked={params.quizAnswer === option.id}
              kind="todo"
              size="small"
              on:value={() => {
                params.quizAnswer = option.id
              }}
              disabled={params.quizAnswer === option.id}
            />
          {/if}
          <svelte:fragment slot="after">
            <div class="option-actions">
              <ButtonIcon
                icon={emoji.icon.Emoji}
                size="small"
                iconSize="small"
                kind="tertiary"
                on:click={(e) => {
                  showEmojiPicker(e, option.id)
                }}
              />
              {#if params.options.length > 1 && i !== params.options.length - 1}
                <ButtonIcon
                  icon={IconClose}
                  size="small"
                  iconSize="small"
                  kind="tertiary"
                  on:click={() => {
                    removeOption(option)
                  }}
                />
              {/if}
            </div>
          </svelte:fragment>
        </ModernEditbox>
      {/each}
    </div>

    <div class="poll__setting-item">
      <ModernToggle
        label={communication.string.AnonymousVoting}
        size="large"
        checked={params.anonymous ?? false}
        on:change={() => {
          params = { ...params, anonymous: !(params.anonymous ?? false) }
        }}
      />
      <ModernToggle
        label={communication.string.MultipleChoice}
        size="large"
        checked={params.mode === 'multiple'}
        on:change={() => {
          params = { ...params, mode: params.mode === 'multiple' ? 'single' : 'multiple' }
        }}
        disabled={params.quiz}
      />
      <ModernToggle
        label={communication.string.QuizMode}
        size="large"
        checked={params.quiz ?? false}
        on:change={() => {
          params = { ...params, quiz: !(params.quiz ?? false), mode: params.quiz ? params.mode : 'single' }
        }}
      />
    </div>
    <div class="poll__setting-item line">
      <span class="label"><Label label={communication.string.StartTime} /></span>
      <DateTimePresenter bind:value={params.startAt} editable />
    </div>
    <div class="poll__setting-item line">
      <span class="label"><Label label={communication.string.EndTime} /></span>
      <DateTimePresenter bind:value={params.endAt} editable />
    </div>
  </div>
</Modal>

<style lang="scss">
  .poll {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    flex-shrink: 0;
    width: 100%;
    min-width: 0;
  }
  .poll__setting-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    flex-shrink: 0;
    padding: 1rem 0;
    width: 100%;
    min-width: 0;

    &.line {
      flex-direction: row;
      align-items: center;
      padding-bottom: 0;
    }
  }
  .label {
    text-transform: uppercase;
    font-weight: 500;
    font-size: 0.75rem;
    font-style: normal;
    line-height: 1rem;
    color: var(--global-secondary-TextColor);
  }

  .option-actions {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    margin-right: -0.5rem;
  }
</style>
