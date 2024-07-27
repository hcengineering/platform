import extract from './extract/extract'
import { read } from './extract/types'
import importExtractedFile from './import'
import convert from './convert/convert'
import { Config } from './config'

export async function importDoc (config: Config): Promise<void> {
  const { specFile, doc, backend } = config

  const spec = await read(specFile)
  console.log(`Spec: ${JSON.stringify(spec, undefined, 2)}`)

  const contents = await convert(doc, backend)
  const extractedFile = await extract(contents, spec)
  // console.log(`Extracted data: ${JSON.stringify(extractedFile, undefined, 2)}`)

  await importExtractedFile(config, extractedFile)
}
