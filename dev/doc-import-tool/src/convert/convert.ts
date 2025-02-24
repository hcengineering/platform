import child_process from 'node:child_process'
import mammoth from 'mammoth'

export enum HtmlConversionBackend {
  MAMMOTH = 'mammoth.js',
  PANDOC = 'pandoc'
}

export default async function convert (input: string, backend: HtmlConversionBackend): Promise<string> {
  try {
    const converted = await convertToHtml(backend, input)
    try {
      return tidy(converted)
    } catch (err: any) {
      console.warn(`Couldn't use 'tidy' command: ${err}`)
      return converted
    }
  } catch (err: any) {
    throw new Error(`Failed to convert document using ${backend}: ${err}`)
  }
}

async function convertToHtml (backend: HtmlConversionBackend, input: string): Promise<string> {
  switch (backend) {
    case HtmlConversionBackend.MAMMOTH:
      return (await mammoth.convertToHtml({ path: input })).value
    case HtmlConversionBackend.PANDOC:
      return child_process.execSync(`pandoc --standalone --embed-resources -t html '${input}'`).toString()
  }
}

function tidy (contents: string): string {
  try {
    return child_process
      .execSync('tidy --quiet --drop-empty-elements yes --merge-spans yes --merge-divs yes', { input: contents })
      .toString()
  } catch (err: any) {
    if ('status' in err && err.status >= 2) {
      throw new Error(`${err.error}`)
    }

    return err.stdout.toString()
  }
}

export function getBackend (backend: string): HtmlConversionBackend {
  if (!(Object.values(HtmlConversionBackend) as string[]).includes(backend)) {
    throw new Error(`Backend ${backend} is unsupported`)
  }

  return backend as HtmlConversionBackend
}
