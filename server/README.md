server
===========

This is a simple HTTP server that provides backend endpoints for the applications.


# Setup

The server is running in HTTPS protocol by default. You need to provide your own key and cert files to make it run. 
Put the files in the root directory. You might need to edit src/index.js:

```javascript
const server = Bun.serve({
    port: process.env.SERVER_PORT,
    hostname: process.env.SERVER_HOST,
    development: true,
    fetch(req) {
        ...
    error(error) {
      return new Response(`<pre>${error}\n${error.stack}</pre>`, {
        status: 500,
        headers: {
          'Content-Type': 'text/html',
        },
      })
    },
    tls: {
      key: Bun.file('./key.pem'), // <-- key file
      cert: Bun.file('./cert.pem'), // <-- cert file
    }
})
```

If you do not want to run in HTTPS, remove the ***tls*** part in index.js.
Please note that for some applications, you will need HTTPS for audio/video capture, etc. when you test it using other devices.

Copy `.env.example` and rename it to `.env` then edit the `OPENAI_API_KEY` and use your own OpenAI API key.
Also edit the `SERVER_HOST` and `SERVER_PORT` to your own configuration.

```sh
OPENAI_API_KEY=YOUR-OPENAI-API-KEY
SERVER_HOST=192.168.0.1
SERVER_PORT=3000
```

To run the server

```bash
bun start
```

This project was created using `bun init` in bun v1.0.25. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
