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

import { loadBrandingMap } from '@hcengineering/server-core'
import { serveAccount } from '@hcengineering/account-service'
import { MeasureMetricsContext, newMetrics, type Tx } from '@hcengineering/core'
import builder, { getModelVersion, migrateOperations } from '@hcengineering/model-all'

const enabled = (process.env.MODEL_ENABLED ?? '*').split(',').map((it) => it.trim())
const disabled = (process.env.MODEL_DISABLED ?? '').split(',').map((it) => it.trim())

const txes = JSON.parse(JSON.stringify(builder(enabled, disabled).getTxes())) as Tx[]

const metricsContext = new MeasureMetricsContext('account', {}, {}, newMetrics())

const brandingPath = process.env.BRANDING_PATH

serveAccount(metricsContext, getModelVersion(), txes, migrateOperations, '', loadBrandingMap(brandingPath))
