//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//

import { DOMAIN_TX } from '@hcengineering/core'
import { DOMAIN_TASK } from '@hcengineering/model-task'
import tracker from '@hcengineering/tracker'

import { DOMAIN_TRACKER } from '../types'
import { migrateAddStartDate, migrateRelationActivityAttachment } from '../migration'

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

describe('migrateRelationActivityAttachment', () => {
  it('looks up the relation create-tx in DOMAIN_TX (not DOMAIN_MODEL_TX)', async () => {
    const findDomains: string[] = []
    const client: any = {
      find: jest.fn(async (domain: string, q: any) => {
        findDomains.push(domain)
        // one broken remove-DUM on the first (DOMAIN_ACTIVITY) call:
        if (domain === 'activity') {
          return [{ _id: 'dum1', objectId: 'rel1', attachedToClass: 'x', updateCollection: undefined }]
        }
        return [] // tx lookup returns empty regardless of domain
      }),
      update: jest.fn(async () => undefined)
    }
    await migrateRelationActivityAttachment(client)
    // The create-tx lookup MUST hit DOMAIN_TX, never DOMAIN_MODEL_TX.
    expect(findDomains).toContain(DOMAIN_TX)
    expect(findDomains).not.toContain('model_tx')
  })
})
