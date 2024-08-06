import { MeasureContext } from '@hcengineering/core'
import docx4js from 'docx4js'
import { AnyNode } from 'domhandler'

import extract from './extract/extract'
import { MetadataContainer, read } from './extract/types'
import importExtractedFile from './import'
import convert from './convert/convert'
import { Config } from './config'

export async function importDoc (ctx: MeasureContext, config: Config): Promise<void> {
  const { specFile, doc, backend } = config

  const spec = await read(specFile)
  console.log(`Spec: ${JSON.stringify(spec, undefined, 2)}`)

  let headerRoot: AnyNode | undefined
  if (spec.metadata.in === MetadataContainer.PageHeaderTableRow) {
    const headerIdx = spec.metadata.headerIdx ?? 1
    const docx = await docx4js.load(config.doc)
    headerRoot = docx.getObjectPart(`word/header${headerIdx}.xml`).root()[0]
  }

  const contents = await convert(doc, backend)
  const extractedFile = await extract(contents, spec, headerRoot)

  await importExtractedFile(ctx, config, extractedFile)
}
