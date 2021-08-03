import { Account, Class, ClassifierKind, Data, Doc, Domain, DOMAIN_MODEL, Obj, Ref, Tx, TxCreateDoc } from '../classes'
import core from '../component'
import { DOMAIN_TX } from '../tx'
import { generateId } from '../utils'

export function createClass<T extends Class<Obj>> (_id: Ref<T>, cl: Omit<Data<T>, 'kind'>, domain?: Domain): Tx {
  const result: TxCreateDoc<Doc> = {
    _id: generateId(),
    _class: core.class.TxCreateDoc,
    objectId: _id,
    objectClass: core.class.Class,
    attributes: {
      kind: ClassifierKind.CLASS,
      domain: domain ?? DOMAIN_MODEL,
      ...cl
    },
    modifiedBy: 'model' as Ref<Account>,
    modifiedOn: Date.now(),
    objectSpace: core.space.Model,
    space: core.space.Model
  }
  return result
}

export function createDoc<T extends Doc> (_class: Ref<Class<T>>, attributes: Data<T>): Tx {
  const tx: TxCreateDoc<T> = {
    _id: generateId(),
    _class: core.class.TxCreateDoc,
    space: core.space.Tx,
    modifiedBy: core.account.System,
    modifiedOn: Date.now(),
    objectId: generateId(),
    objectClass: _class,
    objectSpace: core.space.Model,
    attributes
  }
  return tx
}

/**
 * Generate minimal model for testing purposes.
 * @returns R
 */
export function genMinModel (): Tx[] {
  const txes = []
  // Fill Tx'es with basic model classes.
  txes.push(createClass(core.class.Obj, {}))
  txes.push(createClass(core.class.Doc, { extends: core.class.Obj }))
  txes.push(createClass(core.class.Class, { extends: core.class.Doc }))
  txes.push(createClass(core.class.Space, { extends: core.class.Doc }))
  txes.push(createClass(core.class.Account, { extends: core.class.Doc }))

  txes.push(createClass(core.class.Tx, { extends: core.class.Doc }, DOMAIN_TX))
  txes.push(createClass(core.class.TxCreateDoc, { extends: core.class.Tx }, DOMAIN_TX))
  txes.push(createClass(core.class.TxUpdateDoc, { extends: core.class.Tx }, DOMAIN_TX))
  txes.push(createClass(core.class.TxRemoveDoc, { extends: core.class.Tx }, DOMAIN_TX))

  txes.push(
    createDoc(core.class.Space, {
      name: 'Sp1',
      description: '',
      private: false,
      members: []
    })
  )

  txes.push(
    createDoc(core.class.Space, {
      name: 'Sp2',
      description: '',
      private: false,
      members: []
    })
  )
  return txes
}
