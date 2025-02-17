export function getCondition(table: string, dbField: string, index: number, param: any): { where: string, value: any } | undefined {
    if (typeof param === 'object') {
        if (param.less != null) {
            return {where: `${table}.${dbField} < $${index}`, value: param.less};
        }
        if (param.lessOrEqual != null) {
            return {where: `${table}.${dbField} <= $${index}`, value: param.lessOrEqual};
        }
        if (param.greater != null) {
            return {where: `${table}.${dbField} > $${index}`, value: param.greater};
        }
        if (param.greaterOrEqual != null) {
            return {where: `${table}.${dbField} >= $${index}`, value: param.greaterOrEqual};
        }
    }

    if(param != null) {
        return {where: `${table}.${dbField} = $${index}`, value: param};
    }

    return undefined
}