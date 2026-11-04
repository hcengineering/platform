// SPDX-License-Identifier: EPL-2.0

import { type Markup } from '@hcengineering/core'
import { jsonToMarkup, MarkupNodeType, markupToJSON } from '@hcengineering/text'

import { keepsUnsentDraft } from '../components/chat-message/draftSync'

function text (value: string): Markup {
  return jsonToMarkup({
    type: MarkupNodeType.doc,
    content:
      value === '' ? [] : [{ type: MarkupNodeType.paragraph, content: [{ type: MarkupNodeType.text, text: value }] }]
  })
}

const draft = (message: string, attachments = 0): { message: Markup, attachments: number } => ({
  message: text(message),
  attachments
})

describe('keepsUnsentDraft', () => {
  it('drops a stale copy that was never edited in this input', () => {
    // The sidebar opened earlier with "A", then "A B" was typed and sent from the main view.
    expect(keepsUnsentDraft(draft('A'), draft('A'), draft('A B'))).toBe(false)
  })

  it('drops the copy when it matches the sent message', () => {
    expect(keepsUnsentDraft(draft('A B'), draft('A'), draft('A B'))).toBe(false)
  })

  it('keeps text that was typed in this input and was not sent', () => {
    expect(keepsUnsentDraft(draft('A C'), draft('A'), draft('A B'))).toBe(true)
  })

  it('keeps text typed into an input that opened empty', () => {
    expect(keepsUnsentDraft(draft('C'), draft(''), draft('A B'))).toBe(true)
  })

  it('treats attachment changes made in this input as unsent content', () => {
    expect(keepsUnsentDraft(draft('A', 1), draft('A'), draft('A B'))).toBe(true)
    expect(keepsUnsentDraft(draft('A', 1), draft('A', 1), draft('A B'))).toBe(false)
  })

  it('compares markup by content, not by serialization', () => {
    const loaded = { message: jsonToMarkup(markupToJSON(text('A'))), attachments: 0 }
    expect(keepsUnsentDraft(draft('A'), loaded, draft('A B'))).toBe(false)
  })

  it('treats a missing attachment count as zero', () => {
    expect(keepsUnsentDraft({ message: text('A') }, draft('A'), { message: text('A B') })).toBe(false)
  })
})
