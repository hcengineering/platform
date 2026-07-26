//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//

import { DOMAIN_TASK } from '@hcengineering/model-task'
import tracker from '@hcengineering/tracker'

import { DOMAIN_TRACKER } from '../types'
import { migrateAddStartDate } from '../migration'

describe('migrateAddStartDate', () => {
  it('sets startDate=null on every Issue lacking the field (DOMAIN_TASK)', async () => {
    const update = jest.fn().mockResolvedValue(undefined)
    const client: any = { update }

    await migrateAddStartDate(client)

    expect(update).toHaveBeenCalledWith(
      DOMAIN_TASK,
      { _class: tracker.class.Issue, startDate: { $exists: false } },
      { startDate: null }
    )
  })

  it('sets startDate=null on every Milestone lacking the field (DOMAIN_TRACKER)', async () => {
    const update = jest.fn().mockResolvedValue(undefined)
    const client: any = { update }

    await migrateAddStartDate(client)

    expect(update).toHaveBeenCalledWith(
      DOMAIN_TRACKER,
      { _class: tracker.class.Milestone, startDate: { $exists: false } },
      { startDate: null }
    )
  })

  it('issues exactly two update calls (one per class)', async () => {
    const update = jest.fn().mockResolvedValue(undefined)
    const client: any = { update }

    await migrateAddStartDate(client)

    expect(update).toHaveBeenCalledTimes(2)
  })
})
