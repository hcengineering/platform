Bun.serve({
  port: 3003,

  fetch(req) {
    const url = new URL(req.url)
    const headers = {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
    if (url.pathname === '/') {
      return new Response(Bun.file('./index.html'), { headers })
    }

    if (url.pathname.endsWith('index.js')) {
      return new Response(Bun.file('../dist/index.js'), { headers })
    }

    if (url.pathname.endsWith('sqlite3-opfs-async-proxy.js')) {
      return new Response(
        Bun.file('../../../node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3-opfs-async-proxy.js'),
        {
          headers
        }
      )
    }

    if (url.pathname.endsWith('index.mjs')) {
      return new Response(Bun.file('../../../node_modules/@sqlite.org/sqlite-wasm/index.mjs'), {
        headers
      })
    }

    if (url.pathname.endsWith('sqlite3-worker1-promiser.mjs')) {
      return new Response(
        Bun.file('../../../node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3-worker1-promiser.mjs'),
        {
          headers
        }
      )
    }

    if (url.pathname.endsWith('sqlite3-worker1-bundler-friendly.mjs')) {
      return new Response(
        Bun.file(
          '../../../node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3-worker1-bundler-friendly.mjs'
        ),
        {
          headers
        }
      )
    }

    if (url.pathname.endsWith('sqlite3.js')) {
      return new Response(Bun.file('../../../node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3.js'), {
        headers
      })
    }

    if (url.pathname.endsWith('.wasm')) {
      return new Response(Bun.file('../../../node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3.wasm'), {
        headers: {
          ...headers,
          ContentType: 'application/wasm'
        }
      })
    }

    return new Response('Not Found', { status: 404, headers })
  }
})
