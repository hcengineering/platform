/* eslint-disable @typescript-eslint/unbound-method */
import core, {
  type Class,
  type Doc,
  type Hierarchy,
  type Ref,
  type Tx,
  type TxCUD,
  TxProcessor
} from '@hcengineering/core'

export function fulltextModelFilter (h: Hierarchy, model: Tx[]): Tx[] {
  const allowedClasess: Ref<Class<Doc>>[] = [
    core.class.Class,
    core.class.Attribute,
    core.class.Mixin,
    core.class.Type,
    core.class.Status,
    core.class.Permission,
    core.class.Space,
    core.class.Tx,
    core.class.FullTextSearchContext
  ]
  return model.filter(
    (it) =>
      TxProcessor.isExtendsCUD(it._class) &&
      allowedClasess.some((cl) => h.isDerived((it as TxCUD<Doc>).objectClass, cl))
  )
}
