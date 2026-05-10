import {
  WORKSPACE_MEMBER_STATUS_MESSAGE_MAX,
  extractLeadingStatusEmoji,
  getWorkspaceMemberStatusSubtitle,
  isWorkspaceMemberStatusVisible,
  trimWorkspaceMemberStatusMessage
} from '../workspaceMemberStatusUtils'

describe('workspaceMemberStatusUtils', () => {
  it('trimWorkspaceMemberStatusMessage enforces max length', () => {
    const long = 'x'.repeat(WORKSPACE_MEMBER_STATUS_MESSAGE_MAX + 50)
    expect(trimWorkspaceMemberStatusMessage(long).length).toBe(WORKSPACE_MEMBER_STATUS_MESSAGE_MAX)
    expect(trimWorkspaceMemberStatusMessage('  hi  ')).toBe('hi')
  })

  it('trimWorkspaceMemberStatusMessage keeps emoji intact at boundary', () => {
    const max = WORKSPACE_MEMBER_STATUS_MESSAGE_MAX
    const input = 'a'.repeat(max - 1) + '😀' + 'z'
    const out = trimWorkspaceMemberStatusMessage(input)
    expect(Array.from(out).length).toBe(max)
    expect(out.endsWith('😀')).toBe(true)
  })

  it('isWorkspaceMemberStatusVisible respects clearAt and empty message', () => {
    const now = 1_000_000
    expect(isWorkspaceMemberStatusVisible(undefined, now)).toBe(false)
    expect(isWorkspaceMemberStatusVisible({ message: '', clearAt: now - 1 }, now)).toBe(false)
    expect(isWorkspaceMemberStatusVisible({ message: '' }, now)).toBe(false)
    expect(isWorkspaceMemberStatusVisible({ message: 'Hi' }, now)).toBe(true)
    expect(isWorkspaceMemberStatusVisible({ message: '🏖️' }, now)).toBe(true)
  })

  it('getWorkspaceMemberStatusSubtitle returns trimmed message when visible', () => {
    const now = 10_000_000
    expect(getWorkspaceMemberStatusSubtitle({ message: '🏖️ Beach', clearAt: now + 1000 }, now)).toBe('🏖️ Beach')
    expect(getWorkspaceMemberStatusSubtitle({ message: 'Only text' }, now)).toBe('Only text')
    expect(getWorkspaceMemberStatusSubtitle({ message: '' }, now)).toBe(undefined)
  })

  it('extractLeadingStatusEmoji takes first emoji sequence', () => {
    expect(extractLeadingStatusEmoji('🏖️ Holiday')).toBe('🏖️')
    expect(extractLeadingStatusEmoji('⏳ In a meeting')).toBe('⏳')
    expect(extractLeadingStatusEmoji('No emoji')).toBe(undefined)
    expect(extractLeadingStatusEmoji('')).toBe(undefined)
    expect(extractLeadingStatusEmoji('👋')).toBe('👋')
  })
})
