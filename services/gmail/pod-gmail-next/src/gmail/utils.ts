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
import { wait } from '../utils'
import { gmail_v1 } from 'googleapis'

export async function getEmail (gmail: gmail_v1.Resource$Users): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const profile = await gmail.getProfile({
      userId: 'me'
    })
    const email = profile.data.emailAddress ?? undefined
    if (email !== undefined) return email
    await wait(5)
  }
  throw new Error("Can't get profile email after 3 attempts")
}
