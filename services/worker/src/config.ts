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
import { config as dotenvConfig } from 'dotenv'

dotenvConfig()

export interface Config {
  DbUrl: string
  PollInterval: number
  QueueRegion: string
  QueueConfig: string
}

const config: Config = {
  DbUrl: process.env.DB_URL ?? 'postgres://localhost:5432/huly',
  PollInterval: process.env.POLL_INTERVAL != null ? Number(process.env.POLL_INTERVAL) : 20000,
  QueueRegion: process.env.QUEUE_REGION ?? 'cockroach',
  QueueConfig: process.env.QUEUE_CONFIG ?? ''
}

export default config
