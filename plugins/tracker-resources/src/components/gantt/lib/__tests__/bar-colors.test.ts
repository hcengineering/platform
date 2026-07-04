//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import type { Ref } from '@hcengineering/core'
import type { Issue, IssueStatus, Component, Milestone } from '@hcengineering/tracker'
import { IssuePriority } from '@hcengineering/tracker'
import { PaletteColorIndexes } from '@hcengineering/ui'
import { resolveBarColors, type BarColorContext } from '../bar-colors'

const ctx: BarColorContext = {
  statusCategoryFor: () => 'task:statusCategory:ToDo',
  priorityFor: (i) => i.priority,
  assigneeRankFor: () => 0,
  componentColorFor: () => 4,
  milestoneColorFor: () => 7,
  hashFromId: (id) => id.length
}

const issue = {
  _id: 'iss-aa' as Ref<Issue>,
  status: 'sid' as Ref<IssueStatus>,
  priority: IssuePriority.High,
  assignee: 'u1' as any,
  component: 'cmp-1' as Ref<Component>,
  milestone: 'mst-1' as Ref<Milestone>
} as unknown as Issue

describe('resolveBarColors', () => {
  it('mode=status returns the status-fill triple', () => {
    const c = resolveBarColors(issue, 'status', ctx)
    expect(c.fill).toContain('state-primary') // contrast-fix variant
  })

  it('mode=priority maps Urgent→Orange, High→Sunshine, Medium→Ocean, Low→Cloud, NoPriority→Blueberry', () => {
    expect(resolveBarColors({ ...issue, priority: IssuePriority.Urgent } as any, 'priority', ctx).paletteIndex).toBe(
      PaletteColorIndexes.Orange
    )
    expect(resolveBarColors({ ...issue, priority: IssuePriority.High } as any, 'priority', ctx).paletteIndex).toBe(
      PaletteColorIndexes.Sunshine
    )
    expect(resolveBarColors({ ...issue, priority: IssuePriority.Medium } as any, 'priority', ctx).paletteIndex).toBe(
      PaletteColorIndexes.Ocean
    )
    expect(resolveBarColors({ ...issue, priority: IssuePriority.Low } as any, 'priority', ctx).paletteIndex).toBe(
      PaletteColorIndexes.Cloud
    )
    expect(
      resolveBarColors({ ...issue, priority: IssuePriority.NoPriority } as any, 'priority', ctx).paletteIndex
    ).toBe(PaletteColorIndexes.Blueberry)
  })

  it('mode=assignee uses assigneeRankFor; null → neutral fill', () => {
    const c1 = resolveBarColors(issue, 'assignee', ctx)
    expect(c1.paletteIndex).toBe(0)
    const c2 = resolveBarColors(issue, 'assignee', { ...ctx, assigneeRankFor: () => null })
    expect(c2.fill).toContain('button-default')
  })

  it('mode=component uses componentColorFor; null (no component) → neutral fill', () => {
    expect(resolveBarColors(issue, 'component', ctx).paletteIndex).toBe(4)
    const noCmp = { ...issue, component: null } as any
    expect(resolveBarColors(noCmp, 'component', ctx).fill).toContain('button-default')
  })

  it('mode=component, undefined explicit color → hash-from-id fallback', () => {
    const ctxFallback = { ...ctx, componentColorFor: () => undefined }
    const c = resolveBarColors(issue, 'component', ctxFallback)
    expect(c.paletteIndex).toBe(ctx.hashFromId('cmp-1') % 24) // 24 = PaletteColorIndexes size
  })

  it('mode=milestone analogous to component', () => {
    expect(resolveBarColors(issue, 'milestone', ctx).paletteIndex).toBe(7)
    const noMst = { ...issue, milestone: null } as any
    expect(resolveBarColors(noMst, 'milestone', ctx).fill).toContain('button-default')
  })

  it('mode=none always returns the uniform neutral', () => {
    expect(resolveBarColors(issue, 'none', ctx).fill).toContain('button-default')
  })

  it('synthetic milestone-summary bar (no status, no priority) returns NEUTRAL in any mode', () => {
    const synthetic = { title: 'Sprint 5', startDate: 0, dueDate: 1 } as any
    expect(resolveBarColors(synthetic, 'status', ctx).fill).toContain('button-default')
    expect(resolveBarColors(synthetic, 'priority', { ...ctx, priorityFor: () => undefined }).fill).toContain(
      'button-default'
    )
  })
})
