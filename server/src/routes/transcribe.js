import path from 'path'
//import * as openai from '../services/openai'
import Router from '../lib/router'
import { CORS_HEADERS } from '../lib/cors'
//import { trim_array, stream_loop } from '../lib/utils'
//import get_weather from '../tools/get_weather.json'

const route = new Router('/transcribe')

route.post('/', async (req) => {
    
    try {

        const formdata = await req.formData()
        const name = formdata.get('name')
        const file = formdata.get('file')

        if (!file) throw new Error('Audio data not found')

        const filename = `tmp-${Date.now()}-${name}`
        const filepath = path.join('public', 'uploads', filename)

        await Bun.write(filepath, file)
        
        console.log("saved file!")

        return new Response(
            JSON.stringify({
                iat: Date.now(),
                text: 'Lorem ipsum dolor...'
            }),
            { status: 200, headers: CORS_HEADERS }
        )

    } catch(error) {

        console.log(error.message)

        throw new Error(error.message)
    }

})

export default route.handler