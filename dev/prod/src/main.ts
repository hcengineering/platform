/*!
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering, Inc.
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
*/

// import { setMetadata } from '@anticrm/platform'
import { createApp } from '@anticrm/ui'
// import login from '@anticrm/login'
// import pluginCore from '@anticrm/plugin-core'
// import meetingPlugin from '@anticrm/meeting'

import { configurePlatform } from './platform'

configurePlatform()

// const accountsUrl = process.env.APP_ACCOUNTS_URL
// const appHost = process.env.APP_WSHOST
// const appPort = process.env.APP_WSPORT
// const appToken = process.env.APP_TOKEN
// const meetingHost = process.env.MEETING_WSHOST
// const meetingPort = process.env.MEETING_WSPORT

// setMetadata(login.metadata.AccountsUrl, accountsUrl)
// setMetadata(pluginCore.metadata.ClientUrl, `${appHost}:${appPort}/${appToken}`)
// setMetadata(meetingPlugin.metadata.ClientUrl, `${meetingHost}:${meetingPort}`)
// platform.setMetadata(core.metadata.WSHost, host)
// platform.setMetadata(core.metadata.WSPort, port)

// const loginInfo = currentAccount()
// if (loginInfo) {
//   platform.setMetadata(core.metadata.WhoAmI, loginInfo.email)
//   platform.setMetadata(core.metadata.Token, loginInfo.token)
// }

// async function boot (): Promise<void> {
//   uiService.createApp(document.body)
// }

// boot().catch(err => {
//   new ErrorPage({ target: document.body, props: { error: err.message } })
// })

createApp(document.body)
