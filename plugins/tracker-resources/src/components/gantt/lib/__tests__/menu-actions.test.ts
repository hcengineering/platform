//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'

// Side-effect-heavy dependencies are stubbed before importing menu-actions
// so the test runs in the node jest env (no svelte loader, no DOM).
jest.mock(
  '@hcengineering/ui',
  () => ({
    DatePopup: 'DatePopup',
    NotificationSeverity: { Error: 'Error' },
    addNotification: jest.fn(),
    showPopup: jest.fn()
  }),
  { virtual: true }
)
jest.mock('@hcengineering/ui/src/components/icons/Calendar.svelte', () => 'CalendarIcon', { virtual: true })
jest.mock(
  '@hcengineering/presentation',
  () => ({
    getClient: jest.fn(() => ({
      updateDoc: jest.fn(async () => 'ok')
    }))
  }),
  { virtual: true }
)
jest.mock(
  '@hcengineering/platform',
  () => ({
    translate: jest.fn(async (s: unknown) => `translated:${String(s)}`)
  }),
  { virtual: true }
)
jest.mock('../../GanttHierarchySubmenu.svelte', () => 'GanttHierarchySubmenu', { virtual: true })

// Mock the tracker plugin shim used by menu-actions. The file imports
// `tracker from '../../../plugin'`, which is the tracker-resources plugin
// re-export — its real implementation pulls in svelte assets we cannot
// load in the node test env, so we stub the few identifiers menu-actions
// reads.
jest.mock(
  '../../../../plugin',
  () => ({
    __esModule: true,
    default: {
      string: {
        SetStartDate: 'tracker:string:SetStartDate',
        Hierarchy: 'tracker:string:Hierarchy',
        GanttDragFailed: 'tracker:string:GanttDragFailed'
      },
      icon: {
        Parent: 'tracker:icon:Parent'
      }
    }
  }),
  { virtual: true }
)

import { ganttExtraActions, openSetStartDate } from '../menu-actions'

function makeIssue (overrides: Partial<Issue> = {}): Issue {
  return {
    _id: 'iss-1' as Ref<Issue>,
    _class: 'tracker:class:Issue' as any,
    space: 'space:default' as any,
    modifiedOn: 0,
    modifiedBy: 'me' as any,
    createdOn: 0,
    createdBy: 'me' as any,
    identifier: 'PROJ-1',
    title: 'Alpha',
    startDate: null,
    dueDate: null,
    parents: [],
    ...overrides
  } as unknown as Issue
}

describe('ganttExtraActions — shape', () => {
  it('returns exactly two entries: SetStartDate + Hierarchy', () => {
    const actions = ganttExtraActions(makeIssue(), undefined)
    expect(actions).toHaveLength(2)
    expect(actions[0].label).toBe('tracker:string:SetStartDate')
    expect(actions[1].label).toBe('tracker:string:Hierarchy')
  })

  it('assigns SetStartDate to the edit group and Hierarchy to associate', () => {
    const [a, b] = ganttExtraActions(makeIssue(), undefined)
    expect(a.group).toBe('edit')
    expect(b.group).toBe('associate')
  })

  it('sets a Calendar icon on SetStartDate', () => {
    const [a] = ganttExtraActions(makeIssue(), undefined)
    expect(a.icon).toBe('CalendarIcon')
  })

  it('attaches the GanttHierarchySubmenu component on the Hierarchy entry', () => {
    const [, b] = ganttExtraActions(makeIssue(), undefined)
    expect((b as any).component).toBe('GanttHierarchySubmenu')
    expect((b as any).props).toEqual({ issue: expect.any(Object) })
    expect((b as any).props.issue.identifier).toBe('PROJ-1')
  })

  it('exposes async action callbacks on both entries', () => {
    const [a, b] = ganttExtraActions(makeIssue(), undefined)
    expect(typeof a.action).toBe('function')
    expect(typeof b.action).toBe('function')
  })

  it('Hierarchy entry action is a no-op that resolves (submenu is component-routed)', async () => {
    const [, b] = ganttExtraActions(makeIssue(), undefined)
    await expect(b.action({} as any, new Event('click') as any)).resolves.toBeUndefined()
  })
})

describe('ganttExtraActions — issue threading', () => {
  it('forwards the issue argument into the Hierarchy submenu props', () => {
    const i = makeIssue({ identifier: 'PROJ-99', title: 'Omega' } as Partial<Issue>)
    const [, b] = ganttExtraActions(i, undefined)
    expect((b as any).props.issue).toBe(i)
  })

  it('returns independent arrays per call (does not leak a shared singleton)', () => {
    const a1 = ganttExtraActions(makeIssue(), undefined)
    const a2 = ganttExtraActions(makeIssue(), undefined)
    expect(a1).not.toBe(a2)
    expect(a1[0]).not.toBe(a2[0])
  })
})

describe('openSetStartDate — popup wiring', () => {
  it('invokes showPopup with DatePopup and the issue start-date pre-filled', () => {
    const ui = require('@hcengineering/ui')
    ;(ui.showPopup as jest.Mock).mockClear()
    const start = Date.UTC(2026, 4, 7)
    openSetStartDate(makeIssue({ startDate: start } as Partial<Issue>), undefined)
    expect(ui.showPopup).toHaveBeenCalledTimes(1)
    const [comp, props] = (ui.showPopup as jest.Mock).mock.calls[0]
    expect(comp).toBe('DatePopup')
    expect(props.currentDate).toBeInstanceOf(Date)
    expect((props.currentDate as Date).getTime()).toBe(start)
    expect(props.withTime).toBe(false)
    expect(props.label).toBe('tracker:string:SetStartDate')
  })

  it('passes currentDate=null when the issue has no start-date yet', () => {
    const ui = require('@hcengineering/ui')
    ;(ui.showPopup as jest.Mock).mockClear()
    openSetStartDate(makeIssue(), undefined)
    const [, props] = (ui.showPopup as jest.Mock).mock.calls[0]
    expect(props.currentDate).toBeNull()
  })
})

describe('openSetStartDate — callback semantics', () => {
  it('does nothing when the popup is dismissed (result === undefined)', async () => {
    const presentation = require('@hcengineering/presentation')
    const ui = require('@hcengineering/ui')
    const updateDoc = jest.fn(async () => 'ok')
    ;(presentation.getClient as jest.Mock).mockReturnValueOnce({ updateDoc })
    ;(ui.showPopup as jest.Mock).mockClear()
    openSetStartDate(makeIssue(), undefined)
    const [, , , cb] = (ui.showPopup as jest.Mock).mock.calls[0]
    cb(undefined)
    expect(updateDoc).not.toHaveBeenCalled()
  })

  it('writes startDate=null when the user clears the date', async () => {
    const presentation = require('@hcengineering/presentation')
    const ui = require('@hcengineering/ui')
    const updateDoc = jest.fn(async () => 'ok')
    ;(presentation.getClient as jest.Mock).mockReturnValueOnce({ updateDoc })
    ;(ui.showPopup as jest.Mock).mockClear()
    const iss = makeIssue({ startDate: Date.UTC(2026, 4, 7), dueDate: Date.UTC(2026, 4, 9) } as Partial<Issue>)
    openSetStartDate(iss, undefined)
    const [, , , cb] = (ui.showPopup as jest.Mock).mock.calls[0]
    cb({ value: null })
    await new Promise((r) => setImmediate(r))
    expect(updateDoc).toHaveBeenCalledTimes(1)
    const patch = (updateDoc as jest.Mock).mock.calls[0][3]
    expect(patch.startDate).toBeNull()
    // Auto-fill must NOT fire when both dates were already set.
    expect(patch.dueDate).toBeUndefined()
  })

  it('auto-fills dueDate = startDate + 1 day when both dates were null', async () => {
    const presentation = require('@hcengineering/presentation')
    const ui = require('@hcengineering/ui')
    const updateDoc = jest.fn(async () => 'ok')
    ;(presentation.getClient as jest.Mock).mockReturnValueOnce({ updateDoc })
    ;(ui.showPopup as jest.Mock).mockClear()
    openSetStartDate(makeIssue(), undefined)
    const [, , , cb] = (ui.showPopup as jest.Mock).mock.calls[0]
    const pick = new Date(Date.UTC(2026, 4, 7))
    cb({ value: pick })
    await new Promise((r) => setImmediate(r))
    expect(updateDoc).toHaveBeenCalledTimes(1)
    const patch = (updateDoc as jest.Mock).mock.calls[0][3]
    expect(patch.startDate).toBe(Date.UTC(2026, 4, 7))
    expect(patch.dueDate).toBe(Date.UTC(2026, 4, 7) + 86_400_000)
  })

  it('does NOT auto-fill when the issue already has a dueDate', async () => {
    const presentation = require('@hcengineering/presentation')
    const ui = require('@hcengineering/ui')
    const updateDoc = jest.fn(async () => 'ok')
    ;(presentation.getClient as jest.Mock).mockReturnValueOnce({ updateDoc })
    ;(ui.showPopup as jest.Mock).mockClear()
    openSetStartDate(makeIssue({ dueDate: Date.UTC(2026, 4, 12) } as Partial<Issue>), undefined)
    const [, , , cb] = (ui.showPopup as jest.Mock).mock.calls[0]
    cb({ value: new Date(Date.UTC(2026, 4, 7)) })
    await new Promise((r) => setImmediate(r))
    const patch = (updateDoc as jest.Mock).mock.calls[0][3]
    expect(patch.startDate).toBe(Date.UTC(2026, 4, 7))
    expect(patch.dueDate).toBeUndefined()
  })
})
