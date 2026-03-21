import type { MeasureContext, WorkspaceInfoWithStatus, WorkspaceUuid } from '@hcengineering/core'
import { GithubWorkerWorkspaceState, getGithubWorkerState } from '../workspaceUtils'

const WS = '00000000-0000-0000-0000-000000000001' as WorkspaceUuid

const DAY_MS = 24 * 60 * 60 * 1000

function createMockCtx (): MeasureContext {
  return {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  } as unknown as MeasureContext
}

function baseInfo (overrides: Partial<WorkspaceInfoWithStatus> = {}): WorkspaceInfoWithStatus {
  return {
    uuid: WS,
    name: 'ws',
    url: 'ws-url',
    createdOn: 0,
    versionMajor: 0,
    versionMinor: 7,
    versionPatch: 0,
    mode: 'active',
    processingAttemps: 0,
    ...overrides
  }
}

describe('getGithubWorkerState', () => {
  it('returns Skip and warns when uuid is absent', () => {
    const ctx = createMockCtx()
    const checked = new Set<string>()
    const info = { ...baseInfo(), uuid: undefined as unknown as WorkspaceUuid }
    const state = getGithubWorkerState(ctx, WS, info, 3, checked)
    expect(state).toBe(GithubWorkerWorkspaceState.Skip)
    expect(ctx.warn).toHaveBeenCalled()
  })

  it('returns Skip when workspace is disabled', () => {
    const ctx = createMockCtx()
    const state = getGithubWorkerState(ctx, WS, baseInfo({ isDisabled: true, mode: 'active' }), 3, new Set())
    expect(state).toBe(GithubWorkerWorkspaceState.Skip)
    expect(ctx.info).toHaveBeenCalled()
  })

  it.each(['pending-deletion', 'deleting', 'deleted'] as const)('returns Skip for mode %s', (mode) => {
    const ctx = createMockCtx()
    expect(getGithubWorkerState(ctx, WS, baseInfo({ mode }), 3, new Set())).toBe(GithubWorkerWorkspaceState.Skip)
  })

  it.each(['archived', 'archiving-pending-backup', 'archiving-clean'] as const)(
    'returns Skip for archiving %s',
    (mode) => {
      const ctx = createMockCtx()
      expect(getGithubWorkerState(ctx, WS, baseInfo({ mode }), 3, new Set())).toBe(GithubWorkerWorkspaceState.Skip)
    }
  )

  it.each(['upgrading', 'creating', 'pending-creation'] as const)('returns Wait for mode %s', (mode) => {
    const ctx = createMockCtx()
    expect(getGithubWorkerState(ctx, WS, baseInfo({ mode }), 3, new Set())).toBe(GithubWorkerWorkspaceState.Wait)
    expect(ctx.warn).toHaveBeenCalled()
  })

  it('returns Wait when last visit exceeds inactivity interval', () => {
    const ctx = createMockCtx()
    const nowMs = 1_700_000_000_000
    const lastVisit = nowMs - 4 * DAY_MS
    expect(getGithubWorkerState(ctx, WS, baseInfo({ mode: 'active', lastVisit }), 3, new Set(), nowMs)).toBe(
      GithubWorkerWorkspaceState.Wait
    )
  })

  it('returns Connect when within inactivity interval', () => {
    const ctx = createMockCtx()
    const nowMs = 1_700_000_000_000
    const lastVisit = nowMs - 2 * DAY_MS
    expect(getGithubWorkerState(ctx, WS, baseInfo({ mode: 'active', lastVisit }), 3, new Set(), nowMs)).toBe(
      GithubWorkerWorkspaceState.Connect
    )
  })

  it('does not apply inactivity gate when interval is 0', () => {
    const ctx = createMockCtx()
    const nowMs = 1_700_000_000_000
    const lastVisit = nowMs - 365 * DAY_MS
    expect(getGithubWorkerState(ctx, WS, baseInfo({ mode: 'active', lastVisit }), 0, new Set(), nowMs)).toBe(
      GithubWorkerWorkspaceState.Connect
    )
  })

  it('missing lastVisit uses epoch → Wait inactive when interval > 0', () => {
    const ctx = createMockCtx()
    const nowMs = 1_700_000_000_000
    expect(getGithubWorkerState(ctx, WS, baseInfo({ mode: 'active' }), 3, new Set(), nowMs)).toBe(
      GithubWorkerWorkspaceState.Wait
    )
  })

  it('logs inactive warning only once per workspace id', () => {
    const ctx = createMockCtx()
    const checked = new Set<string>()
    const nowMs = 1_700_000_000_000
    const info = baseInfo({ mode: 'active', lastVisit: nowMs - 10 * DAY_MS })
    getGithubWorkerState(ctx, WS, info, 3, checked, nowMs)
    getGithubWorkerState(ctx, WS, info, 3, checked, nowMs)
    expect(ctx.warn).toHaveBeenCalledTimes(1)
  })
})
