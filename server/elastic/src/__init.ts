//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Client } from '@elastic/elasticsearch'

const url = process.env.ELASTIC_URL
if (url === undefined) {
  console.error('please provide elastic url.')
  process.exit(1)
}

const client = new Client({ node: url })

client.ingest
  .putPipeline({
    id: 'anticrm-pipeline',
    body: {
      processors: [{ attachment: { field: 'data' } }, { remove: { field: 'data' } }]
    }
  })
  .then(function () {
    console.log('putPipeline Resolved')
  })
  .catch(function (error) {
    console.log('putPipeline error: ', error)
  })

// // Create index
// client.create({index: 'pdfs', type: 'pdf', id: 'my-index-id',
//     body: {description: 'Test pdf indexing'}
// })
// .then(function () {console.log("Index created");})
// .catch(function (error) {console.log(error);})

// var body = {
//   anticrm_doc: {
//       properties:{
//           title : {"type" : "keyword", "index" : "false"},
//           type  : {"type" : "keyword", "index" : "false"},
//           "attachment.pdf" : {"type" : "keyword"}
//       }
//   }
// }

// client.indices.putMapping({index:"pdfs", type:"pdf", body:body})
// .then((response) => {addPipeline()})
// .catch((error) => {console.log("putMapping error: " + error)})
