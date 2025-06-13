import core, { generateId, Hierarchy, MeasureMetricsContext, ModelDb, platformNow } from '@hcengineering/core'
import contact, { AvatarType, type Contact } from '@hcengineering/contact'
import { faker } from '@faker-js/faker'
import buildModel from '@hcengineering/model-all'

const model = buildModel().getTxes()
describe('mem-objects', () => {
  it('check add session', async () => {
    const hierarchy = new Hierarchy()
    for (const tx of model) {
      hierarchy.tx(tx)
    }
    const memdb = new ModelDb(hierarchy)
    memdb.addTxes(new MeasureMetricsContext('test', {}), model, false)

    const before = process.memoryUsage().heapUsed
    for (let i = 0; i < 100000; i++) {
      const d: Contact = {
        _class: contact.class.Contact,
        _id: generateId(),
        _uuid: core.workspace.Any,
        space: core.space.Model,
        modifiedBy: core.account.System,
        modifiedOn: Date.now(),
        name: faker.person.fullName(),
        avatarType: AvatarType.GRAVATAR,
        avatarProps: {
          url: faker.internet.username()
        }
      }
      memdb.addDoc(d)
    }
    const after = process.memoryUsage().heapUsed
    console.log('memdb size', after - before)

    const t0 = platformNow()
    const t1 = await memdb.findAll(contact.class.Contact, {
      name: faker.person.fullName()
    })
    console.log('findAll', platformNow() - t0, t1.length)
  })
})
