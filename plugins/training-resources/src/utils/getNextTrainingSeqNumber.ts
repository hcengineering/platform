//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { getClient } from '@hcengineering/presentation'
import core, { type Sequence } from '@hcengineering/core'
import training from '../plugin'

export async function getNextTrainingSeqNumber (): Promise<number> {
  const client = getClient()

  const sequence = await client.findOne(core.class.Sequence, { attachedTo: training.class.Training })
  if (sequence === undefined) {
    throw new Error(`Sequence for ${training.class.Training} not found`)
  }

  const inc = await client.update(sequence, { $inc: { sequence: 1 } }, true)

  return (inc as { object: Sequence }).object.sequence
}
