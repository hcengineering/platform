//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
import { isCalendarReady } from '../calendar-ready'

const loaded = {
  projectCfgLoaded: true,
  cfgPresent: true,
  hrModelPresent: true,
  departmentsLoaded: true,
  holidaysLoaded: true
}

describe('isCalendarReady', () => {
  it('is NOT ready before the project config answered — even when that project may turn out legacy', () => {
    // `workingDaysCfg` starts undefined; before the first project response
    // that state is indistinguishable from legacy mode. Mutations must wait.
    expect(
      isCalendarReady({
        ...loaded,
        projectCfgLoaded: false,
        cfgPresent: false,
        departmentsLoaded: false,
        holidaysLoaded: false
      })
    ).toBe(false)
  })

  it('is ready in legacy mode once the config answered (no HR query at all)', () => {
    expect(isCalendarReady({ ...loaded, cfgPresent: false, departmentsLoaded: false, holidaysLoaded: false })).toBe(
      true
    )
  })

  it('is ready with config but without the hr model (empty holiday list, no throw)', () => {
    expect(isCalendarReady({ ...loaded, hrModelPresent: false, departmentsLoaded: false, holidaysLoaded: false })).toBe(
      true
    )
  })

  it('is NOT ready while holidays are pending', () => {
    expect(isCalendarReady({ ...loaded, holidaysLoaded: false })).toBe(false)
  })

  it('is NOT ready while departments are pending', () => {
    expect(isCalendarReady({ ...loaded, departmentsLoaded: false })).toBe(false)
  })

  it('is ready when config, departments and holidays all answered', () => {
    expect(isCalendarReady(loaded)).toBe(true)
  })
})
