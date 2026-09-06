//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { type Class, type Doc, type DocumentQuery, type FindOptions, type Ref } from '@hcengineering/core'
import { type Department, type PublicHoliday } from '@hcengineering/hr'
import { type Project, type WorkingDaysConfig } from '@hcengineering/tracker'

import { isCalendarReady } from './calendar-ready'
import { resolveHolidayScope, resolveHrHolidays } from './hr-holidays'

/**
 * Structural subset of presentation's LiveQuery wrapper (`createQuery()`).
 * The state machine depends on this interface only, so unit tests can
 * inject plain fakes without importing `@hcengineering/presentation`.
 */
export interface LiveQueryLike {
  query: <T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    callback: (result: T[]) => void,
    options?: FindOptions<T>
  ) => boolean
  unsubscribe: () => void
}

/**
 * Captured at mutation start (bar mousedown, row drag start, keyboard
 * shift). Every persist site and every async confirmation callback
 * re-validates against it via `isTicketCurrent` — a project switch bumps
 * the generation synchronously, so a mutation that began before the switch
 * can never commit afterwards.
 */
export interface MutationTicket {
  generation: number
  space: Ref<Project> | undefined
}

/** What GanttView consumes: readiness, the config, resolved holiday days. */
export interface CalendarSnapshot {
  ready: boolean
  /**
   * Whether calendar-dependent mutations (drag/resize/cascade/keyboard-shift/
   * auto-schedule) may be started at all. Requires `ready` AND a concrete
   * project context: the all-projects view has no single project calendar, so
   * those edits are read-only there. `ready` alone stays true in all-projects
   * for display (legacy calendar-day rendering).
   */
  mutable: boolean
  cfg: WorkingDaysConfig | undefined
  holidays: number[]
}

/**
 * Owns the complete Phase-2 calendar load/switch state: the per-project
 * config query, the HR department/holiday queries (model-optional runtime
 * integration — the caller probes `hierarchy.hasClass` once and passes the
 * result in), the synchronous project-switch reset, a monotonically
 * increasing generation counter and the mutation tickets derived from it.
 *
 * Deliberately framework-free: GanttView only mirrors `snapshot` into a
 * reactive variable via the `onChange` callback.
 */
export class CalendarStateMachine {
  private generation = 0
  // Sentinel `null` differs from the legitimate `undefined` (all-projects
  // view), so the very first setSpace() always initializes the state.
  private space: Ref<Project> | undefined | null = null
  private cfg: WorkingDaysConfig | undefined = undefined
  private projectCfgLoaded = false
  private departments = new Map<Ref<Department>, Department>()
  private departmentsLoaded = false
  private rawHolidays: PublicHoliday[] = []
  private holidaysLoaded = false

  constructor (
    private readonly q: { project: LiveQueryLike, departments: LiveQueryLike, holidays: LiveQueryLike },
    private readonly hrModelPresent: boolean,
    private readonly classes: {
      project: Ref<Class<Project>>
      department: Ref<Class<Department>>
      holiday: Ref<Class<PublicHoliday>>
    },
    private readonly head: Ref<Department>,
    private readonly onChange: (snap: CalendarSnapshot) => void,
    private readonly onProjectSwitch: () => void
  ) {}

  private get ready (): boolean {
    return isCalendarReady({
      projectCfgLoaded: this.projectCfgLoaded,
      cfgPresent: this.cfg !== undefined,
      hrModelPresent: this.hrModelPresent,
      departmentsLoaded: this.departmentsLoaded,
      holidaysLoaded: this.holidaysLoaded
    })
  }

  /**
   * Calendar-dependent mutations require a concrete project context. The
   * all-projects view (`space === undefined`) has no single project calendar,
   * so drag/resize/cascade/keyboard-shift/auto-schedule are read-only there;
   * a naive legacy-day fallback would silently ignore the target project's
   * WorkingDaysConfig. Manual, calendar-independent date-picks (context menu)
   * are unaffected — they never take a mutation ticket.
   */
  get calendarMutable (): boolean {
    return this.ready && this.space !== undefined && this.space !== null
  }

  get snapshot (): CalendarSnapshot {
    const scope = resolveHolidayScope(
      this.cfg?.holidayDepartment as Ref<Department> | undefined,
      this.head,
      this.departments
    )
    return {
      ready: this.ready,
      mutable: this.calendarMutable,
      cfg: this.cfg,
      holidays: resolveHrHolidays(this.rawHolidays, scope)
    }
  }

  setSpace (sp: Ref<Project> | undefined): void {
    if (this.space !== null && sp === this.space) return
    const isSwitch = this.space !== null
    // SYNCHRONOUS invalidation: generation bump + full reset happen before
    // any async work. Every in-flight mutation captured an older generation
    // and is rejected by isTicketCurrent from this point on.
    this.generation++
    this.space = sp
    this.projectCfgLoaded = false
    this.cfg = undefined
    this.teardownHr()
    if (isSwitch) this.onProjectSwitch()
    if (sp === undefined) {
      // All-projects view: no per-project config by definition — legacy
      // calendar-day mode, immediately ready.
      this.q.project.unsubscribe()
      this.projectCfgLoaded = true
      this.emit()
      return
    }
    this.emit()
    const gen = this.generation
    this.q.project.query(
      this.classes.project,
      { _id: sp },
      (res) => {
        // Stale-callback rejection: a response subscribed before a later
        // switch must not resurrect the old project's state.
        if (gen !== this.generation) return
        // `?? undefined` normalizes a legacy `null` in the DB — `null` must
        // not masquerade as a configured calendar.
        this.cfg = res[0]?.workingDaysConfig ?? undefined
        this.projectCfgLoaded = true
        this.syncHr()
        this.emit()
      },
      { limit: 1 }
    )
  }

  private syncHr (): void {
    if (!this.hrModelPresent || this.cfg === undefined) {
      this.teardownHr()
      return
    }
    const gen = this.generation
    // teardownHr() ran during setSpace and LiveQuery.unsubscribe() clears
    // its stored class/query/callback comparison base — so this fresh
    // subscription is never swallowed by LQ.query()'s dedupe (which returns
    // false without ever firing a callback when class/query/callback-text/
    // options are unchanged), even though the parameters are identical
    // across projects. A config edit within the SAME project re-enters here
    // with a live identical subscription: the dedupe then correctly no-ops.
    this.q.departments.query(this.classes.department, {}, (res) => {
      if (gen !== this.generation) return
      this.departments = new Map(res.map((d) => [d._id, d]))
      this.departmentsLoaded = true
      this.emit()
    })
    this.q.holidays.query(this.classes.holiday, {}, (res) => {
      if (gen !== this.generation) return
      this.rawHolidays = res
      this.holidaysLoaded = true
      this.emit()
    })
  }

  private teardownHr (): void {
    this.q.departments.unsubscribe()
    this.q.holidays.unsubscribe()
    this.departments = new Map()
    this.rawHolidays = []
    this.departmentsLoaded = false
    this.holidaysLoaded = false
  }

  beginMutation (): MutationTicket {
    return { generation: this.generation, space: this.space ?? undefined }
  }

  /**
   * The stale-mutation guard: calendar mutations must be permitted at all
   * (`calendarMutable` — ready AND a concrete project context, so a ticket
   * is rejected once the view switched into all-projects), the generation
   * must be unchanged since the mutation started, and — when the caller
   * knows the space it is about to write to — that target space must match
   * the currently displayed project.
   */
  isTicketCurrent (t: MutationTicket, targetSpace?: Ref<Project>): boolean {
    if (!this.calendarMutable) return false
    if (t.generation !== this.generation) return false
    // Defense-in-depth: the ticket's own captured space must still match the
    // machine's current space. Generation already moves on every switch, so
    // this is redundant with the generation gate in normal flow, but it keeps
    // MutationTicket.space meaningful and rejects a crafted/stale ticket whose
    // space drifted from the current project.
    if (t.space !== this.space) return false
    if (targetSpace !== undefined && targetSpace !== this.space) return false
    return true
  }

  private emit (): void {
    this.onChange(this.snapshot)
  }
}
