import path from 'path'
import { exec } from 'child_process'
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

        let filename = `tmp-${Date.now()}-${name}`
        let filepath = path.join('public', 'uploads', filename)

        await Bun.write(filepath, file)

        // remove silent parts
        let outpath = `${path.join('public', 'uploads', `out-${filename}`)}`
        const retval = await new Promise((resolve, reject) => {

            const sCommand = `ffmpeg -i ${filepath} -af silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB ${outpath}`
            
            exec(sCommand, (error, stdout, stderr) => {
                
                if (error) {
                    
                    resolve({
                        status: 'error',
                    })

                } else {

                    resolve({
                        status: 'success',
                        error: stderr,
                        out: stdout,
                    })

                }
                
            })

        })

        // if successful, use the output file
        if(retval.status === 'success') {
            filepath = outpath
        }

        // check file size
        const minFileSize = 18000 // bytes

        const check_file = Bun.file(filepath)
        console.log('file size', check_file.size) // number of bytes
        
        if(check_file.size < minFileSize) {
        
            console.log('** audio data is probably empty **')
    
            return new Response(JSON.stringify({
                    text: '',
                }), 
                { status: 200, headers: CORS_HEADERS }
            )
    
        }

        return new Response(
            JSON.stringify({
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