// Svelte 4 and its runtime emit ESM. Jest loads both through this CommonJS transform.
// Styles are excluded from these DOM/state tests; browsers must still verify SCSS/focus.
const { compile } = require('svelte/compiler')
const ts = require('typescript')

module.exports = {
  process (source, filename) {
    let output = source
    if (filename.endsWith('.svelte')) {
      const input = source.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '').replace(
        /<script\s+lang="ts">([\s\S]*?)<\/script>/g,
        (_, script) =>
          `<script>${
            ts.transpileModule(script, {
              compilerOptions: {
                target: ts.ScriptTarget.ES2020,
                module: ts.ModuleKind.ESNext,
                verbatimModuleSyntax: true
              }
            }).outputText
          }</script>`
      )
      output = compile(input, { filename, generate: 'dom', dev: true }).js.code
    }
    return {
      code: ts.transpileModule(output, {
        compilerOptions: {
          allowJs: true,
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true
        },
        fileName: filename + '.js'
      }).outputText
    }
  }
}
