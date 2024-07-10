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

import { startBackup } from '@hcengineering/backup-service'
import { MeasureMetricsContext } from '@hcengineering/core'
import { DummyDbAdapter, DummyFullTextAdapter, type PipelineFactory } from '@hcengineering/server-core'
import { createServerPipeline } from '@hcengineering/server-pipeline'

const ctx = new MeasureMetricsContext('backup-service', {})
startBackup(ctx, (mongoUrl, storageAdapter) => {
  const factory: PipelineFactory = createServerPipeline(
    ctx,
    mongoUrl,
    {
      externalStorage: storageAdapter,
      fullTextUrl: '',
      indexParallel: 0,
      indexProcessing: 0,
      rekoniUrl: '',
      usePassedCtx: true
    },
    {
      adapters: {
        FullTextBlob: {
          factory: async () => new DummyDbAdapter(),
          url: ''
        }
      },
      fulltextAdapter: {
        factory: async () => new DummyFullTextAdapter(),
        stages: () => [],
        url: ''
      }
    }
  )
  return factory
})
