//
// Copyright © 2021 Anticrm Platform Contributors.
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

function keyEscape (key: string, reverse: boolean): string {
  const kkk = [
    ['$', '\\$'],
    ['.', '%{dot}']
  ]
  for (const kk of kkk) {
    key = key.split(kk[reverse ? 1 : 0]).join(kk[reverse ? 0 : 1])
  }
  return key
}

function escape<T> (object: T, reverse: boolean): T {
  if (Array.isArray(object)) {
    return escapeArray(object, reverse)
  }
  return isObject<T>(object) ? escapeObject(object, reverse) : object
}
function isObject<T> (object: T): boolean {
  return object != null && typeof object === 'object'
}

function escapeObject<T> (object: T, reverse: boolean): T {
  const result: any = {}
  for (const [k, v] of Object.entries(object)) {
    result[keyEscape(k, reverse)] = escape(v, reverse)
  }
  return result as T
}
function escapeArray<T> (object: T & any[], reverse: boolean): T {
  return object.map((t) => escape(t, reverse)) as unknown as T
}

/**
 * Return object with all keys started with $ escaped.
 * @public
 */
export function mongoEscape<T> (object: T): T {
  return escape(object, false)
}
/**
 * Return object with all keys started with $ un-escaped.
 * @public
 */
export function mongoUnescape<T> (object: T): T {
  return escape(object, true)
}

/**
 * Replaces nulls with undefined
 * @public
 */
export function mongoReplaceNulls<T> (x: T): T | undefined {
  if (Array.isArray(x)) {
    return (x as any).map(mongoReplaceNulls)
  }

  if (isObject(x)) {
    return Object.entries(x)
      .map(([k, v]) => [k, mongoReplaceNulls(v)])
      .reduce<any>((res, [k, v]) => {
      res[k] = v
      return res
    }, {}) as T
  }

  return x === null ? undefined : x
}
