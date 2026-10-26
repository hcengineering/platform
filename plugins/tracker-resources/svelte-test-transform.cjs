// Compile mounted test components in memory, without the application bundler or CSS pipeline.
const { compile } = require('svelte/compiler')
const ts = require('typescript')

function javascript (source, filename, module) {
  return ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module,
      esModuleInterop: true,
      // Components imported in a script can be used only in Svelte markup.
      verbatimModuleSyntax: module === ts.ModuleKind.ESNext
    }
  }).outputText
}

module.exports = {
  process (source, filename) {
    if (filename.endsWith('.svelte')) {
      const preprocessed = source
        .replace(/<script lang="ts">([\s\S]*?)<\/script>/g, (_, script) => {
          return `<script>${javascript(script, `${filename}.ts`, ts.ModuleKind.ESNext)}</script>`
        })
        .replace(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/g, '')
      source = compile(preprocessed, { filename, generate: 'dom', css: 'external' }).js.code
    }
    return { code: javascript(source, `${filename}.js`, ts.ModuleKind.CommonJS) }
  }
}
