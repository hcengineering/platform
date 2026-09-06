//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import { type Class, type Ref } from '@hcengineering/core'
import { type Department } from '@hcengineering/hr'
import { type Project } from '@hcengineering/tracker'
import { CalendarStateMachine, type CalendarSnapshot, type LiveQueryLike } from '../calendar-state'

// Dedupe- and dispatch-faithful fake of the LiveQuery wrapper (`createQuery()`,
// packages/presentation/src/utils.ts) — NOT an always-success mock:
// - query() compares class + query + callback TEXT + options against the live
//   subscription and returns false on equality, WITHOUT re-subscribing or
//   re-arming the callback (:474-481).
// - Results are delivered queued (microtask), never synchronously — mirroring
//   the reducedDoQuery scheduling (:484-493).
// - unsubscribe() clears the comparison state (:541-550); only then is a later
//   IDENTICAL re-subscription accepted again.
// An always-success fake would hide exactly the dedupe/async races this suite
// exists for. (`@hcengineering/presentation` itself is not loadable in the node
// jest env — hence this contract-faithful adapter behind the structural
// `LiveQueryLike` seam.)
class FakeQuery implements LiveQueryLike {
  log: string[] = []
  private current: {
    clazz: unknown
    q: string
    cb: string
    opts: string
    callback: (res: any[]) => void
  } | null = null

  query = (_class: unknown, q: unknown, callback: (res: any[]) => void, options?: unknown): boolean => {
    const next = {
      clazz: _class,
      q: JSON.stringify(q),
      cb: callback.toString(),
      opts: JSON.stringify(options ?? null),
      callback
    }
    const c = this.current
    if (c !== null && c.clazz === next.clazz && c.q === next.q && c.cb === next.cb && c.opts === next.opts) {
      this.log.push('dedupe')
      return false // identical subscription stays, callback is NOT re-armed
    }
    this.current = next
    this.log.push('query')
    return true
  }

  unsubscribe = (): void => {
    this.log.push('unsub')
    this.current = null // clears the comparison state — re-arms identical queries
  }

  get lastCallback (): ((res: any[]) => void) | null {
    return this.current?.callback ?? null
  }

  // Delivery as in the original: queued, never synchronous. `await respond(…)`
  // returns only after the callback has run.
  async respond (res: any[]): Promise<void> {
    const cb = this.current?.callback
    if (cb === undefined) throw new Error('no active subscription')
    await Promise.resolve()
    cb(res)
  }
}

interface Rig {
  machine: CalendarStateMachine
  project: FakeQuery
  departments: FakeQuery
  holidays: FakeQuery
  snapshots: CalendarSnapshot[]
  switchCount: () => number
}

function build (hrModelPresent = true): Rig {
  const project = new FakeQuery()
  const departments = new FakeQuery()
  const holidays = new FakeQuery()
  const snapshots: CalendarSnapshot[] = []
  let switches = 0
  const machine = new CalendarStateMachine(
    { project, departments, holidays },
    hrModelPresent,
    {
      project: 'class:Project' as unknown as Ref<Class<Project>>,
      department: 'class:Department' as unknown as Ref<Class<Department>>,
      holiday: 'class:PublicHoliday' as unknown as Ref<Class<any>>
    },
    'head' as Ref<Department>,
    (s) => snapshots.push(s),
    () => {
      switches++
    }
  )
  return { machine, project, departments, holidays, snapshots, switchCount: () => switches }
}

const sp = (id: string): Ref<Project> => id as unknown as Ref<Project>
const proj = (cfg: unknown): Project[] => [{ workingDaysConfig: cfg } as unknown as Project]
const CFG = { weekdayMask: 31 }
const CFG_TEAM = { weekdayMask: 31, holidayDepartment: 'team' }
const dept = (id: string, parent?: string): Department => ({ _id: id, parent }) as unknown as Department
const hol = (day: number, department: string): any => ({ date: { year: 2026, month: 11, day, offset: 0 }, department })

describe('load sequencing', () => {
  it('is not ready before the project query answered', () => {
    const r = build()
    r.machine.setSpace(sp('p1'))
    expect(r.machine.snapshot.ready).toBe(false)
  })

  it('legacy project (no config): ready right after the project answer, HR never queried', async () => {
    const r = build()
    r.machine.setSpace(sp('p1'))
    await r.project.respond(proj(undefined))
    expect(r.machine.snapshot.ready).toBe(true)
    expect(r.machine.snapshot.cfg).toBeUndefined()
    expect(r.departments.log).not.toContain('query')
    expect(r.holidays.log).not.toContain('query')
  })

  it('configured project: NOT ready until BOTH departments AND holidays answered', async () => {
    const r = build()
    r.machine.setSpace(sp('p1'))
    await r.project.respond(proj(CFG_TEAM))
    expect(r.machine.snapshot.ready).toBe(false)
    await r.departments.respond([dept('head'), dept('team', 'head')])
    expect(r.machine.snapshot.ready).toBe(false) // holidays still pending
    await r.holidays.respond([hol(24, 'team'), hol(25, 'other')])
    expect(r.machine.snapshot.ready).toBe(true)
    // Scope applied through the machine: own department yes, foreign no.
    expect(r.machine.snapshot.holidays).toEqual([Date.UTC(2026, 11, 24)])
  })

  it('is order-independent: holidays may answer before departments', async () => {
    const r = build()
    r.machine.setSpace(sp('p1'))
    await r.project.respond(proj(CFG))
    await r.holidays.respond([hol(26, 'head')])
    expect(r.machine.snapshot.ready).toBe(false) // departments still pending
    await r.departments.respond([dept('head')])
    expect(r.machine.snapshot.ready).toBe(true)
    expect(r.machine.snapshot.holidays).toEqual([Date.UTC(2026, 11, 26)])
  })

  it('a delayed holiday re-answer updates the snapshot after readiness', async () => {
    const r = build()
    r.machine.setSpace(sp('p1'))
    await r.project.respond(proj(CFG))
    await r.departments.respond([dept('head')])
    await r.holidays.respond([])
    expect(r.machine.snapshot.holidays).toEqual([])
    await r.holidays.respond([hol(26, 'head')])
    expect(r.machine.snapshot.ready).toBe(true)
    expect(r.machine.snapshot.holidays).toEqual([Date.UTC(2026, 11, 26)])
  })

  it('dispatches responses asynchronously: the snapshot updates only after the queued dispatch ran', async () => {
    const r = build()
    r.machine.setSpace(sp('p1'))
    await r.project.respond(proj(CFG))
    await r.departments.respond([dept('head')])
    // Kick off the dispatch but do NOT await yet — as with the real
    // reducedDoQuery scheduling, nothing may happen synchronously.
    const pending = r.holidays.respond([hol(26, 'head')])
    expect(r.machine.snapshot.ready).toBe(false) // dispatch still queued
    expect(r.machine.snapshot.holidays).toEqual([])
    await pending
    expect(r.machine.snapshot.ready).toBe(true)
    expect(r.machine.snapshot.holidays).toEqual([Date.UTC(2026, 11, 26)])
  })

  it('hr model absent: ready with empty holidays, HR queries never issued', async () => {
    const r = build(false)
    r.machine.setSpace(sp('p1'))
    await r.project.respond(proj(CFG))
    expect(r.machine.snapshot.ready).toBe(true)
    expect(r.machine.snapshot.holidays).toEqual([])
    expect(r.departments.log).not.toContain('query')
    expect(r.holidays.log).not.toContain('query')
  })

  it('normalizes a legacy null config to legacy mode', async () => {
    const r = build()
    r.machine.setSpace(sp('p1'))
    await r.project.respond(proj(null))
    expect(r.machine.snapshot.ready).toBe(true)
    expect(r.machine.snapshot.cfg).toBeUndefined()
  })

  it('all-projects view (undefined space): ready for DISPLAY but not mutable, project query unsubscribed', () => {
    const r = build()
    r.machine.setSpace(undefined)
    // ready stays true so the aggregate view still renders (legacy day mode),
    // but calendar-dependent mutations are read-only: there is no single
    // project calendar to apply.
    expect(r.machine.snapshot.ready).toBe(true)
    expect(r.machine.snapshot.mutable).toBe(false)
    expect(r.machine.calendarMutable).toBe(false)
    expect(r.project.log).toContain('unsub')
    expect(r.project.log).not.toContain('query')
  })
})

describe('project switch', () => {
  async function readyOnP1 (): Promise<Rig> {
    const r = build()
    r.machine.setSpace(sp('p1'))
    await r.project.respond(proj(CFG_TEAM))
    await r.departments.respond([dept('head'), dept('team', 'head')])
    await r.holidays.respond([hol(24, 'team')])
    expect(r.machine.snapshot.ready).toBe(true)
    return r
  }

  it('resets SYNCHRONOUSLY: not-ready before any response, HR torn down, switch callback fired', async () => {
    const r = await readyOnP1()
    r.machine.setSpace(sp('p2'))
    expect(r.machine.snapshot.ready).toBe(false)
    expect(r.machine.snapshot.cfg).toBeUndefined()
    expect(r.machine.snapshot.holidays).toEqual([])
    expect(r.switchCount()).toBe(1)
    // setSpace(p1) tore down (unsub), cfg arrived (query), setSpace(p2) tore down again.
    expect(r.departments.log).toEqual(['unsub', 'query', 'unsub'])
  })

  it('rejects a stale project callback captured before the switch (switch-during-fetch)', async () => {
    const r = build()
    r.machine.setSpace(sp('p1'))
    const stale = r.project.lastCallback
    r.machine.setSpace(sp('p2'))
    stale?.(proj(CFG) as any[]) // p1 answers late — must be dropped
    expect(r.machine.snapshot.ready).toBe(false)
    expect(r.machine.snapshot.cfg).toBeUndefined()
    await r.project.respond(proj(undefined)) // p2's real answer
    expect(r.machine.snapshot.ready).toBe(true)
    expect(r.machine.snapshot.cfg).toBeUndefined()
  })

  it('re-subscribes HR freshly after a switch: unsubscribe always precedes the new query (dedupe-safe)', async () => {
    const r = await readyOnP1()
    r.machine.setSpace(sp('p2'))
    await r.project.respond(proj(CFG))
    // With the dedupe-faithful fake this sequence is conclusive: if the
    // machine did NOT unsubscribe before re-subscribing, this would read
    // 'dedupe' instead of the second 'query' — the HR parameters are
    // identical across projects.
    expect(r.departments.log).toEqual(['unsub', 'query', 'unsub', 'query'])
    await r.departments.respond([dept('head')])
    await r.holidays.respond([])
    expect(r.machine.snapshot.ready).toBe(true)
  })

  it('an identical HR re-subscription after unsubscribe ACTUALLY delivers (p1 → p2 → p1)', async () => {
    const r = await readyOnP1()
    r.machine.setSpace(sp('p2'))
    r.machine.setSpace(sp('p1'))
    await r.project.respond(proj(CFG_TEAM))
    // Class, query, callback text and options of the HR queries are identical
    // to the FIRST p1 subscription. This test passes only because unsubscribe
    // cleared the comparison state, so the new query() is accepted AND
    // delivers — not merely logged.
    expect(r.departments.log[r.departments.log.length - 1]).toBe('query')
    expect(r.departments.log).not.toContain('dedupe')
    await r.departments.respond([dept('head'), dept('team', 'head')])
    await r.holidays.respond([hol(24, 'team')])
    expect(r.machine.snapshot.ready).toBe(true)
    expect(r.machine.snapshot.holidays).toEqual([Date.UTC(2026, 11, 24)])
  })
})

describe('fake faithfulness (LiveQuery dedupe contract)', () => {
  it('dedupes an identical re-query (returns false, keeps the first subscription) and re-arms after unsubscribe', async () => {
    const q = new FakeQuery()
    const received: any[][] = []
    // Two separate closure INSTANCES with identical source text — exactly
    // the case the real callback.toString() comparison dedupes.
    const mk = (): ((res: any[]) => void) => (res) => {
      received.push(res)
    }
    expect(q.query('c', { a: 1 }, mk())).toBe(true)
    expect(q.query('c', { a: 1 }, mk())).toBe(false) // identical → dedupe
    expect(q.log).toEqual(['query', 'dedupe'])
    q.unsubscribe()
    // comparison state cleared: identical query is accepted again …
    expect(q.query('c', { a: 1 }, mk())).toBe(true)
    // … and actually delivers.
    await q.respond(['x'])
    expect(received).toEqual([['x']])
  })
})

describe('mutation tickets (generation guard)', () => {
  async function readyLegacy (id: string): Promise<Rig> {
    const r = build()
    r.machine.setSpace(sp(id))
    await r.project.respond(proj(undefined))
    return r
  }

  it('a ticket taken while ready is current — also against its own target space', async () => {
    const r = await readyLegacy('p1')
    const t = r.machine.beginMutation()
    expect(r.machine.isTicketCurrent(t)).toBe(true)
    expect(r.machine.isTicketCurrent(t, sp('p1'))).toBe(true)
  })

  it('a switch invalidates in-flight tickets forever — even once the new project is ready (popup-open case)', async () => {
    const r = await readyLegacy('p1')
    const t = r.machine.beginMutation() // drag started / confirmation popup opened on p1
    r.machine.setSpace(sp('p2'))
    expect(r.machine.isTicketCurrent(t)).toBe(false) // immediately after the switch
    await r.project.respond(proj(undefined)) // p2 fully loaded, calendar ready again
    expect(r.machine.isTicketCurrent(t)).toBe(false) // generation decides, not readiness
  })

  it('skips the commit when the switch happens between ops.update() and ops.commit()', async () => {
    // Wiring scenario for the commit-point guards S9-S13 (Task 5 Step 4):
    // the early guard passes BEFORE ops.update(), but the WRITE is the later
    // ops.commit(). If the project switches while ops.update()/findAll() are
    // awaited, the guard IMMEDIATELY before ops.commit() must skip the stale
    // commit.
    const r = await readyLegacy('p1')
    const t = r.machine.beginMutation()
    // ops.update() runs: the early guard still saw a valid ticket …
    expect(r.machine.isTicketCurrent(t, sp('p1'))).toBe(true)
    // … the project switch resumes mid awaited update()/findAll()
    // (the generation bump is synchronous) …
    r.machine.setSpace(sp('p2'))
    // … so the pre-commit check must fail: no stale commit.
    expect(r.machine.isTicketCurrent(t, sp('p1'))).toBe(false)
    // even after p2 is ready again, the commit stays skipped.
    await r.project.respond(proj(undefined))
    expect(r.machine.isTicketCurrent(t, sp('p1'))).toBe(false)
  })

  it('rejects a persist that targets a foreign space', async () => {
    const r = await readyLegacy('p1')
    const t = r.machine.beginMutation()
    expect(r.machine.isTicketCurrent(t, sp('p2'))).toBe(false)
  })

  it('rejects a ticket whose captured space differs from the current space (defense-in-depth)', async () => {
    const r = await readyLegacy('p1')
    const valid = r.machine.beginMutation()
    // Craft a ticket with the CURRENT generation but a foreign captured space.
    // In normal flow the generation moves on every switch, so this isolates
    // the t.space !== this.space guard: same generation, drifted space.
    const crafted = { generation: valid.generation, space: sp('other') }
    expect(r.machine.isTicketCurrent(crafted)).toBe(false)
    // Sanity: the genuine ticket (matching space) still passes.
    expect(r.machine.isTicketCurrent(valid)).toBe(true)
  })

  it('rejects calendar-dependent tickets in the all-projects view (no project context → read-only)', () => {
    const r = build()
    r.machine.setSpace(undefined)
    const t = r.machine.beginMutation()
    // No concrete project calendar in the aggregate view: a drag/resize/
    // cascade must not persist against a legacy-day fallback that ignores the
    // target project's WorkingDaysConfig. Rejected with and without a target.
    expect(r.machine.calendarMutable).toBe(false)
    expect(r.machine.isTicketCurrent(t)).toBe(false)
    expect(r.machine.isTicketCurrent(t, sp('p1'))).toBe(false)
  })
})
