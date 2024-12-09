import { aiBotId, aiBotAccountEmail } from '@hcengineering/ai-bot'
import contact, { type PersonAccount, type Channel, type Employee } from '@hcengineering/contact'
import { type Domain, type Ref } from '@hcengineering/core'
import {
  type MigrateOperation,
  type MigrationClient,
  tryMigrate,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import { DOMAIN_CHANNEL, DOMAIN_CONTACT } from '@hcengineering/model-contact'

const DOMAIN_ACTIVITY = 'activity' as Domain

async function migrateAiExtraAccounts (client: MigrationClient): Promise<void> {
  const channels = await client.find<Channel>(DOMAIN_CHANNEL, {
    _class: contact.class.Channel,
    value: aiBotAccountEmail
  })
  if (channels.length < 2) return

  const personAccount = (
    await client.model.findAll<PersonAccount>(contact.class.PersonAccount, { email: aiBotAccountEmail })
  )[0]
  if (personAccount === undefined) return

  const employeeIds = channels.map((it) => it.attachedTo) as Ref<Employee>[]
  const employees = await client.find<Employee>(DOMAIN_CONTACT, { _id: { $in: employeeIds } })

  const employeesToDelete = employees.filter((it) => it._id !== personAccount.person)
  const employeesIdsToDelete = employeesToDelete.map((it) => it._id)

  if (employeesIdsToDelete.length === 0) return

  await client.deleteMany(DOMAIN_ACTIVITY, { attachedTo: { $in: employeesIdsToDelete } })
  await client.deleteMany<Channel>(DOMAIN_CHANNEL, { attachedTo: { $in: employeesIdsToDelete } })
  await client.deleteMany(DOMAIN_CONTACT, { _id: { $in: employeesIdsToDelete } })
}

export const aiBotOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, aiBotId, [
      {
        state: 'remove-ai-bot-extra-accounts-v1',
        func: migrateAiExtraAccounts
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
