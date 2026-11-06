//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { type ViewOptions, type ViewOptionsModel } from '@hcengineering/view'

/**
 * Build the view options a viewlet starts with before the user saved any:
 * the first declared grouping and ordering plus the default value of every
 * extra option. Missing grouping/ordering falls back to `fallback`.
 */
export function getViewletDefaultOptions (model: ViewOptionsModel, fallback: ViewOptions): ViewOptions {
  const res: ViewOptions = {
    groupBy: [model.groupBy[0] ?? fallback.groupBy[0]],
    orderBy: model.orderBy?.[0] ?? fallback.orderBy
  }
  for (const opt of model.other) {
    res[opt.key] = opt.defaultValue
  }
  return res
}
