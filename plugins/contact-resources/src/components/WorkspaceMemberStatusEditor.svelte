<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import contact, { type WorkspaceMemberStatus, trimWorkspaceMemberStatusMessage } from '@hcengineering/contact'
  import core, { getCurrentAccount } from '@hcengineering/core'
  import EmojiPopup from '@hcengineering/emoji-resources/src/components/EmojiPopup.svelte'
  import { translate, type IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { createEventDispatcher, onMount } from 'svelte'
  import { getCurrentLanguage } from '@hcengineering/theme'
  import {
    Button,
    DatePopup,
    EditBox,
    Header,
    Label,
    SelectPopup,
    type SelectPopupValueType,
    eventToHTMLElement,
    showPopup,
    closePopup
  } from '@hcengineering/ui'

  import contactPlugin from '../plugin'

  const client = getClient()
  const dispatch = createEventDispatcher()
  const account = getCurrentAccount()

  let message = ''
  type UiPreset = 'away' | 'vacation' | 'outSick' | 'custom'
  let preset: UiPreset = 'custom'
  let emojiText = '💬'
  let clearAt: number | undefined = undefined
  let existing: WorkspaceMemberStatus | undefined = undefined
  type ClearMode = 'none' | 'in30m' | 'in1h' | 'in4h' | 'endOfDay' | 'pickDate'
  let clearMode: ClearMode = 'none'

  const CLEAR_MODE_LABEL: Record<ClearMode, IntlString> = {
    none: contactPlugin.string.WorkspaceStatusDoNotClear,
    in30m: contactPlugin.string.WorkspaceStatusIn30Min,
    in1h: contactPlugin.string.WorkspaceStatusIn1Hour,
    in4h: contactPlugin.string.WorkspaceStatusIn4Hours,
    endOfDay: contactPlugin.string.WorkspaceStatusEndOfDay,
    pickDate: contactPlugin.string.WorkspaceStatusPickDate
  }

  const CLEAR_MODE_MENU_ORDER: ClearMode[] = ['none', 'in30m', 'in1h', 'in4h', 'endOfDay', 'pickDate']

  const presets: Array<{ id: Exclude<UiPreset, 'custom'>, emoji: string, label: IntlString }> = [
    { id: 'away', emoji: '⏳', label: contactPlugin.string.WorkspaceStatusAway },
    { id: 'vacation', emoji: '🏖️', label: contactPlugin.string.WorkspaceStatusVacation },
    { id: 'outSick', emoji: '🤒', label: contactPlugin.string.WorkspaceStatusOutSick }
  ]

  /** Avoid flipping UI preset to `custom` when we programmatically set `message` from a template */
  let skipMarkCustom = false

  function presetEmoji (value: UiPreset): string {
    if (value === 'away') return '⏳'
    if (value === 'vacation') return '🏖️'
    if (value === 'outSick') return '🤒'
    return '💬'
  }

  function emojiToUiPreset (e: string): UiPreset {
    if (e === '⏳') return 'away'
    if (e === '🏖️') return 'vacation'
    if (e === '🤒') return 'outSick'
    return 'custom'
  }

  function splitStoredMessage (raw: string): { emoji: string, text: string } {
    const t = raw.trim()
    if (t === '') return { emoji: '💬', text: '' }
    const sp = t.indexOf(' ')
    if (sp === -1) return { emoji: t, text: '' }
    return { emoji: t.slice(0, sp), text: t.slice(sp + 1).trim() }
  }

  function markCustom (): void {
    if (skipMarkCustom) return
    preset = 'custom'
  }

  async function applyTemplate (template: Exclude<UiPreset, 'custom'>): Promise<void> {
    skipMarkCustom = true
    preset = template
    emojiText = presetEmoji(template)
    const lang = getCurrentLanguage()
    const row = presets.find((p) => p.id === template)
    if (row !== undefined) {
      message = await translate(row.label, {}, lang)
    }
    queueMicrotask(() => {
      skipMarkCustom = false
    })
  }

  onMount(() => {
    void (async () => {
      const doc = await client.findOne(contact.class.WorkspaceMemberStatus, { user: account.uuid })
      existing = doc
      if (doc === undefined) return

      clearAt = doc.clearAt
      syncClearModeFromTimestamp()
      const legacyPreset = (doc as WorkspaceMemberStatus & { preset?: string }).preset
      const raw = (doc.message ?? '').trim()

      if (legacyPreset === 'vacation' && raw === '') {
        await applyTemplate('vacation')
        return
      }

      const { emoji, text } = splitStoredMessage(doc.message ?? '')
      message = text
      emojiText = emoji !== '' ? emoji : '💬'
      preset = emojiToUiPreset(emoji)
    })()
  })

  $: clearModeLabel = CLEAR_MODE_LABEL[clearMode]

  $: untilPickerDateLabel = clearAt !== undefined ? new Date(clearAt).toLocaleDateString() : ''

  $: untilPickerTimeInputValue =
    clearAt === undefined
      ? '09:00'
      : `${String(new Date(clearAt).getHours()).padStart(2, '0')}:${String(new Date(clearAt).getMinutes()).padStart(2, '0')}`

  function getEndOfDayTimestamp (): number {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d.getTime()
  }

  /** Best-effort: stored status only has `clearAt`, not which menu option was chosen */
  function inferClearModeFromTimestamp (ts: number): ClearMode {
    const now = Date.now()
    const toleranceMs = 90 * 1000
    if (ts <= now) return 'none'

    const at = new Date(ts)
    const endOfThatDay = new Date(at)
    endOfThatDay.setHours(23, 59, 59, 999)
    if (Math.abs(ts - endOfThatDay.getTime()) < toleranceMs) return 'endOfDay'

    const diff = ts - now
    if (diff > 0 && diff <= 6 * 60 * 60 * 1000) {
      const near = (ms: number): boolean => Math.abs(diff - ms) < toleranceMs
      if (near(30 * 60 * 1000)) return 'in30m'
      if (near(60 * 60 * 1000)) return 'in1h'
      if (near(4 * 60 * 60 * 1000)) return 'in4h'
    }
    return 'pickDate'
  }

  function applyClearMode (mode: ClearMode): void {
    clearMode = mode
    const now = Date.now()
    if (mode === 'none') {
      clearAt = undefined
      return
    }
    if (mode === 'in30m') {
      clearAt = now + 30 * 60 * 1000
      return
    }
    if (mode === 'in1h') {
      clearAt = now + 60 * 60 * 1000
      return
    }
    if (mode === 'in4h') {
      clearAt = now + 4 * 60 * 60 * 1000
      return
    }
    if (mode === 'endOfDay') {
      clearAt = getEndOfDayTimestamp()
    }
  }

  function syncClearModeFromTimestamp (): void {
    if (clearAt === undefined) {
      clearMode = 'none'
      return
    }
    const inferred = inferClearModeFromTimestamp(clearAt)
    if (inferred === 'none') {
      clearAt = undefined
      clearMode = 'none'
      return
    }
    clearMode = inferred
  }

  function finishPopup (): void {
    closePopup()
    dispatch('close')
  }

  function openUntilDatePicker (ev: MouseEvent): void {
    showPopup(
      DatePopup,
      {
        noShift: true,
        withTime: true,
        currentDate: clearAt !== undefined ? new Date(clearAt) : null,
        label: contactPlugin.string.WorkspaceStatusUntil
      },
      eventToHTMLElement(ev),
      (result) => {
        if (result != null && result.value !== undefined) {
          clearAt = result.value !== null ? result.value.getTime() : undefined
          clearMode = clearAt === undefined ? 'none' : 'pickDate'
        }
      }
    )
  }

  async function openClearModeMenu (ev: MouseEvent): Promise<void> {
    const lang = getCurrentLanguage()
    const value: SelectPopupValueType[] = await Promise.all(
      CLEAR_MODE_MENU_ORDER.map(async (id) => ({
        id,
        text: await translate(CLEAR_MODE_LABEL[id], {}, lang)
      }))
    )

    showPopup(
      SelectPopup,
      {
        value,
        onSelect: (id?: string | number | null) => {
          if (id == null) return
          const mode = String(id) as ClearMode
          if (mode === 'pickDate') {
            clearMode = 'pickDate'
            // SelectPopup does not dispatch `close` when `onSelect` is set — dismiss menu before stacking DatePopup.
            closePopup()
            openUntilDatePicker(ev)
            return
          }
          applyClearMode(mode)
          closePopup()
        }
      },
      eventToHTMLElement(ev)
    )
  }

  function onTimeChange (ev: Event): void {
    if (clearAt === undefined) return
    const value = (ev.target as HTMLInputElement).value
    const [h, m] = value.split(':').map((it) => Number(it))
    if (!Number.isFinite(h) || !Number.isFinite(m)) return
    const d = new Date(clearAt)
    d.setHours(h, m, 0, 0)
    clearAt = d.getTime()
  }

  function openEmojiPicker (ev: MouseEvent): void {
    const target = ev.currentTarget as HTMLElement
    showPopup(EmojiPopup, { selected: emojiText }, target, (result: { text?: string, image?: unknown } | undefined) => {
      if (result?.text === undefined) return
      if (result.image !== undefined) return
      emojiText = result.text
    })
  }

  async function save (): Promise<void> {
    const trimmed = trimWorkspaceMemberStatusMessage(message)
    const chosenEmoji = emojiText.trim() !== '' ? emojiText.trim() : presetEmoji(preset)
    const finalMessage = `${chosenEmoji} ${trimmed}`.trim()
    const empty =
      trimmed === '' && chosenEmoji === presetEmoji('custom') && (clearAt === undefined || clearAt <= Date.now())

    if (empty) {
      if (existing !== undefined) {
        await client.remove(existing)
      }
      finishPopup()
      return
    }

    if (existing !== undefined) {
      await client.update(existing, {
        message: finalMessage,
        ...(clearAt !== undefined ? { clearAt } : { $unset: { clearAt: true } })
      })
    } else {
      await client.createDoc(contact.class.WorkspaceMemberStatus, core.space.Workspace, {
        space: core.space.Workspace,
        user: account.uuid,
        message: finalMessage,
        ...(clearAt !== undefined ? { clearAt } : {})
      } as any)
    }
    finishPopup()
  }

  async function clearAll (): Promise<void> {
    if (existing !== undefined) {
      await client.remove(existing)
    }
    message = ''
    preset = 'custom'
    emojiText = presetEmoji('custom')
    clearAt = undefined
    existing = undefined
    finishPopup()
  }
</script>

<div class="status-modal antiPopup antiPopup-withHeader clear-mins">
  <div class="status-modal__header ap-spaceHeader">
    <Header type={'type-popup'} adaptive={'disabled'} on:close={finishPopup}>
      <div class="status-modal__title fs-title">
        <Label label={contactPlugin.string.WorkspaceStatusMenu} />
      </div>
    </Header>
  </div>

  <div class="status-modal__body ap-spaceContent flex-col flex-gap-3 p-4">
    <div class="status-input-row">
      <div class="status-input-row__emoji">
        <Button
          kind={'ghost'}
          size={'large'}
          padding={'0 0.25rem'}
          minWidth={'2.5rem'}
          justify={'center'}
          on:click={openEmojiPicker}
        >
          <svelte:fragment slot="content">
            <span class="text-lg leading-none">{emojiText}</span>
          </svelte:fragment>
        </Button>
      </div>
      <div class="status-input-grow">
        <EditBox
          bind:value={message}
          placeholder={contactPlugin.string.WorkspaceStatusMessage}
          on:change={markCustom}
        />
      </div>
    </div>

    <div class="status-modal__ghost-bordered flex-col flex-gap-2 w-full">
      {#each presets as item}
        <Button
          kind={'ghost'}
          size={'large'}
          width={'100%'}
          justify={'left'}
          on:click={() => {
            void applyTemplate(item.id)
          }}
        >
          <svelte:fragment slot="content">
            <span class="flex-row-center flex-gap-3 min-w-0">
              <span class="text-lg leading-none shrink-0" aria-hidden="true">{item.emoji}</span>
              <span class="overflow-label"><Label label={item.label} /></span>
            </span>
          </svelte:fragment>
        </Button>
      {/each}
    </div>

    <div class="status-modal__clearAtTitle text-sm content-dark-color">
      <Label label={contactPlugin.string.WorkspaceStatusUntil} />
    </div>
    <div class="status-modal__ghost-bordered w-full">
      <Button
        kind={'ghost'}
        size={'large'}
        width={'100%'}
        justify={'left'}
        on:click={(ev) => {
          void openClearModeMenu(ev)
        }}
      >
        <svelte:fragment slot="content">
          <span class="overflow-label"><Label label={clearModeLabel} /></span>
        </svelte:fragment>
      </Button>
    </div>
    {#if clearAt !== undefined && clearMode === 'pickDate'}
      <div class="flex-row-center flex-gap-2 w-full">
        <div class="status-modal__ghost-bordered flex-grow min-w-0">
          <Button kind={'ghost'} size={'large'} width={'100%'} justify={'left'} on:click={openUntilDatePicker}>
            <svelte:fragment slot="content">
              <span class="text-sm content-dark-color">{untilPickerDateLabel}</span>
            </svelte:fragment>
          </Button>
        </div>
        {#key clearAt}
          <input
            class="until-row__time ml-auto content-color"
            type="time"
            value={untilPickerTimeInputValue}
            on:change={onTimeChange}
          />
        {/key}
      </div>
    {/if}
  </div>

  <div class="status-modal__footer ap-spaceContent flex-row-center flex-gap-2 flex-reverse px-4">
    <Button
      label={contactPlugin.string.WorkspaceStatusSave}
      kind={'primary'}
      size={'large'}
      on:click={() => {
        save().catch(() => {})
      }}
    />
    <div class="status-modal__ghost-bordered">
      <Button
        label={contactPlugin.string.WorkspaceStatusClear}
        kind={'ghost'}
        size={'large'}
        on:click={() => {
          clearAll().catch(() => {})
        }}
      />
    </div>
  </div>
</div>

<style lang="scss">
  @media (min-width: 480px) {
    .status-modal {
      min-width: 22rem;
    }
  }

  .status-modal__header.ap-spaceHeader {
    border-bottom: none;
    box-shadow: none;
  }

  .status-modal__header {
    padding-bottom: 0;
    background: transparent;
  }

  .status-modal__title {
    line-height: 1.25;
  }

  .status-input-row {
    display: flex;
    align-items: stretch;
    width: 100%;
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--medium-BorderRadius);
    background-color: transparent;
    min-height: 2.25rem;
    overflow: visible;
    transition: border-color 0.15s ease;
  }

  /* Match default EditBox focus (see packages/theme/styles/editors.scss .default:focus-within) */
  .status-input-row:focus-within {
    border-color: var(--primary-button-default);
    box-shadow: 0 0 0 1px var(--theme-editbox-focus-border);
  }

  .status-input-row :global(> .antiButton) {
    border: none;
    border-radius: 0;
    box-shadow: none;
    align-self: stretch;
    height: auto;
  }

  .status-modal__ghost-bordered :global(.antiButton.ghost) {
    border: 1px solid var(--theme-divider-color);
    background: transparent;
  }

  .status-modal__clearAtTitle {
    margin-bottom: -0.25rem;
  }

  .status-input-grow {
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .status-input-grow :global(.antiEditBox > .editbox) {
    border: none;
    background: transparent;
    box-shadow: none;
  }

  .status-input-grow :global(.antiEditBox .antiEditBoxInput) {
    outline: none;
  }

  .status-input-grow :global(.antiEditBox .antiEditBoxInput:focus),
  .status-input-grow :global(.antiEditBox .antiEditBoxInput:focus-visible) {
    outline: none;
    box-shadow: none;
  }

  .until-row__time {
    min-width: 7rem;
    min-height: 2.25rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--small-BorderRadius);
    background: transparent;
    padding: 0.3rem 0.45rem;
  }

  :global(html.theme-dark) .until-row__time {
    color-scheme: dark;
  }

  :global(html.theme-light) .until-row__time {
    color-scheme: light;
  }

  .status-modal__footer {
    border-top: none;
    padding-top: 0.5rem;
    padding-bottom: 1rem;
    background: transparent;
  }
</style>
