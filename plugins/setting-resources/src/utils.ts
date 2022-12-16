import { Class, Doc, Hierarchy, Ref } from '@hcengineering/core'
import setting from '@hcengineering/setting'

function isEditable (hierarchy: Hierarchy, p: Class<Doc>): boolean {
  let ancestors = [p._id]
  try {
    ancestors = [...hierarchy.getAncestors(p._id), p._id]
  } catch (err: any) {
    console.error(err)
  }
  for (const ao of ancestors) {
    try {
      const cl = hierarchy.getClass(ao)
      if (hierarchy.hasMixin(cl, setting.mixin.Editable) && hierarchy.as(cl, setting.mixin.Editable).value) {
        return true
      }
    } catch (err: any) {
      return false
    }
  }
  return false
}
export function filterDescendants (
  hierarchy: Hierarchy,
  ofClass: Ref<Class<Doc>> | undefined,
  res: Array<Class<Doc>>
): Array<Ref<Class<Doc>>> {
  let _classes = res
    .filter((it) => {
      try {
        return ofClass != null ? hierarchy.isDerived(it._id, ofClass) : true
      } catch (err: any) {
        return false
      }
    })
    .filter((it) => !(it.hidden ?? false))
    .filter((p) => isEditable(hierarchy, p))

  let len: number
  const _set = new Set(_classes.map((it) => it._id))
  do {
    len = _classes.length
    _classes = _classes.filter((it) => (it.extends != null ? !_set.has(it.extends) : false))
  } while (len !== _classes.length)

  return _classes.map((p) => p._id)
}
