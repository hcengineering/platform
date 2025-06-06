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

import { type Resources } from '@hcengineering/platform'
import EditRequest from './components/EditRequest.svelte'
import RequestPresenter from './components/RequestPresenter.svelte'
import RequestView from './components/RequestView.svelte'
import NotificationRequestView from './components/NotificationRequestView.svelte'
import RequestedChangedNotification from './components/RequestedChangedNotification.svelte'

export { default as RequestStatusPresenter } from './components/RequestStatusPresenter.svelte'
export { default as RequestDetailPopup } from './components/RequestDetailPopup.svelte'

export default async (): Promise<Resources> => ({
  component: {
    EditRequest,
    RequestPresenter,
    RequestView,
    NotificationRequestView,
    RequestedChangedNotification
  }
})
