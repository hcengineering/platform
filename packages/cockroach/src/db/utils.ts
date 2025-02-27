//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

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
