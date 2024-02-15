import { CORS_HEADERS } from './lib/cors'
import { getPathAndFilename, isRoute } from './lib/utils'

import chat from './routes/chat'

const server = Bun.serve({
    port: process.env.SERVER_PORT,
    hostname: process.env.SERVER_HOST,
    development: true,
    fetch(req) {

      if (req.method === 'OPTIONS') {
        return new Response('OK', { status: 200, headers: CORS_HEADERS })
      }

      const { pathname } = new URL(req.url)

      let [ dirpath, filename ] = getPathAndFilename(pathname)

      //console.log(pathname, 'dir:' + dirpath, 'file:' + filename)

      if(isRoute('/test', pathname)) {
        return new Response("this is a test", { headers: CORS_HEADERS, })
      } else if(isRoute('/chat', pathname)) {
        return chat(req)
      } else {
        if(pathname === "/") {
          return new Response(Bun.file("./public/index.html"))
        } else {
          if(dirpath === '/') {
            if(filename) {
              return new Response(Bun.file(`./public/${filename}`))
            }
          } else if(dirpath === '/images') {
            if(filename) {
              return new Response(Bun.file(`./public/images/${filename}`))
            }
          }
        }
      }

      return new Response(`<pre>404\nPage not found!</pre>`, { status: 404, headers: { 'Content-Type': 'text/html', }})

    },
    error(error) {
      return new Response(`<pre>${error}\n${error.stack}</pre>`, {
        status: 500,
        headers: {
          'Content-Type': 'text/html',
        },
      })
    },
    tls: {
      key: Bun.file('./key.pem'),
      cert: Bun.file('./cert.pem'),
    }
})

console.log(`Bun OpenAI server started at ${(new Date()).toLocaleTimeString()} on https://${server.hostname}:${server.port}`)
