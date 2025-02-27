export function getCondition (
  table: string,
  dbField: string,
  index: number,
  param: any,
  type: string
): { where: string, value: any } | undefined {
  if (typeof param === 'object') {
    if (param.less != null) {
      return { where: `${table}.${dbField} < $${index}::${type}`, value: param.less }
    }
    if (param.lessOrEqual != null) {
      return { where: `${table}.${dbField} <= $${index}::${type}`, value: param.lessOrEqual }
    }
    if (param.greater != null) {
      return { where: `${table}.${dbField} > $${index}::${type}`, value: param.greater }
    }
    if (param.greaterOrEqual != null) {
      return { where: `${table}.${dbField} >= $${index}::${type}`, value: param.greaterOrEqual }
    }
  }

  if (param != null) {
    return { where: `${table}.${dbField} = $${index}::${type}`, value: param }
  }

  return undefined
}
