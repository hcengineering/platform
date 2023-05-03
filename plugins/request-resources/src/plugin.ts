//
// Copyright © 2022 Hardcore Engineering Inc.
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

import type { IntlString } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import request, { requestId } from '@hcengineering/request'

export default mergeIds(requestId, request, {
  string: {
    Approve: '' as IntlString,
    Approved: '' as IntlString,
    CreatedRequest: '' as IntlString,
    Cancel: '' as IntlString,
    For: '' as IntlString,
    Change: '' as IntlString,
    Add: '' as IntlString,
    Remove: '' as IntlString,
    Completed: '' as IntlString,
    Reject: '' as IntlString,
    Request: '' as IntlString,
    Rejected: '' as IntlString,
    Comment: '' as IntlString,
    PleaseTypeMessage: '' as IntlString,
    NoRequests: '' as IntlString,
    Cancelled: '' as IntlString
  }
})
