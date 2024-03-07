import { deepEqual } from 'fast-equals'
import core, { Ref, TxOperations } from '@hcengineering/core'
import { PersonAccount } from '@hcengineering/contact'

import chunter, { DirectMessage } from '.'

/**
 * @public
 */
export async function getDirectChannel (
  client: TxOperations,
  me: Ref<PersonAccount>,
  employeeAccount: Ref<PersonAccount>
): Promise<Ref<DirectMessage>> {
  const accIds = [me, employeeAccount].sort()
  const existingDms = await client.findAll(chunter.class.DirectMessage, {})
  for (const dm of existingDms) {
    if (deepEqual(dm.members, accIds)) {
      return dm._id
    }
  }

  return await client.createDoc(chunter.class.DirectMessage, core.space.Space, {
    name: '',
    description: '',
    private: true,
    archived: false,
    members: accIds
  })
}
