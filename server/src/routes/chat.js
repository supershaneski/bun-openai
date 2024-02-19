import path from 'path'
import * as fs from 'node:fs'

import * as openai from '../services/openai'
import Router from '../lib/router'
import { CORS_HEADERS } from '../lib/cors'
import { trim_array, stream_loop } from '../lib/utils'

import get_weather from '../tools/get_weather.json'

const route = new Router('/chat')

route.post('/', async (req) => {
    
    const { previous, query } = await req.json()

    if(!Array.isArray(previous)) {

        return new Response('Bad request', { status: 400, headers: CORS_HEADERS });
        
    }

    const context = trim_array(previous)

    let system_prompt = `You are a helpful assistant.\n` +
        `Today is ${new Date()}.`

    try {

        let messages = [{ role: 'system', content: system_prompt }]
        if(context.length > 0) {
            messages = messages.concat(context)
        }
        if(query) {
            messages.push({ role: 'user', content: query })
        }

        const response = await openai.chat({
            messages,
            temperature: 0.2,
            tools: [
                { type: 'function', function: get_weather },
            ]
        })

        console.log(response)
        console.log(response.message)

        return new Response(JSON.stringify({
            iat: Date.now(),
            message: response.message
        }), { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } })
    

    } catch(error) {
        console.log(error.message)
        throw new Error(error.message)
    }

})

route.post('/tools', async (req) => {
    
    const { previous, tool_calls } = await req.json()

    if(!Array.isArray(tool_calls) || !Array.isArray(previous)) {

        return new Response('Bad request', { status: 400, headers: CORS_HEADERS });
        
    }

    let tool_outputs = []

    for(let tool of tool_calls) {
        
        const tool_id = tool.id
        const tool_name = tool.function.name

        const tool_args = JSON.parse(tool.function.arguments)

        let tool_output = { status: 'error', message: 'function not found' }

        if(tool_name === 'get_weather') {

            const mock_temp = (10 + 20 * Math.random()).toFixed(1)

            const mock_outlook = ['sunny', 'cloudy', 'rainy']

            const mock_chance = Math.floor(mock_outlook.length * Math.random())

            tool_output = { status: 'success', outlook: mock_outlook[mock_chance], temperature: mock_temp, unit: 'celsius', ...tool_args }
        
        }

        tool_outputs.push({ 
            tool_call_id: tool_id, 
            role: 'tool', 
            name: tool_name, 
            content: JSON.stringify(tool_output, null, 2)
        })

    }

    const context = trim_array(previous)

    let system_prompt = `You are a helpful assistant.\n` +
        `Today is ${new Date()}.`
    
    try {

        let messages = [{ role: 'system', content: system_prompt }]
        if(context.length > 0) {
            messages = messages.concat(context)
        }

        messages.push({ role: 'assistant', content: null, tool_calls })

        for(let output of tool_outputs) {
            messages.push(output)
        }
        
        const response = await openai.chat({
            messages,
            temperature: 0.2,
            tools: [
                { type: 'function', function: get_weather },
            ]
        })

        console.log(response)
        console.log(response.message)

        return new Response(JSON.stringify({
            iat: Date.now(),
            message: response.message
        }), { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } })
    

    } catch(error) {
        console.log(error.message)
        throw new Error(error.message)
    }

})

route.post('/stream', async (req) => {

    const { previous, query } = await req.json()

    if(!query || !Array.isArray(previous)) {

        return new Response('Bad request', { status: 400, headers: CORS_HEADERS });
        
    }

    console.log("start streaming...")

    const context = trim_array(previous)

    let system_prompt = `You are a helpful assistant.\n` +
        `Today is ${new Date()}.`

    try {

        let messages = [{ role: 'system', content: system_prompt }]
        if(context.length > 0) {
            messages = messages.concat(context)
        }
        messages.push({ role: 'user', content: query })

        const response = openai.stream({
            messages,
            temperature: 0.2,
            tools: [
                { type: 'function', function: get_weather },
            ]
        })

        const { signal } = req

        console.log('waiting...')

        return new Response(
            new ReadableStream({
            type: "direct",
            async pull(controller) {

                try {

                    console.log('now streaming...')
                    
                    let ret = await stream_loop(response, signal, controller)
                    
                    let message_content = ret.message
                    let tool_calls = ret.tools
                    
                    console.log('end')
                    console.log(message_content)
                    console.log(tool_calls)

                    if(tool_calls.length > 0) {

                        let is_completed = false
                        let max_loop = 30
                        let loop = 0

                        do {

                            console.log(`Loop: ${loop}`)
                            
                            // prepare messages
                            let _messages = messages
                            if(message_content) {
                                _messages.push({ role: 'assistant', content: message_content })
                                messages.push({ role: 'assistant', content: message_content })
                            }
                            _messages.push({ role: 'assistant', content: null, tool_calls })
                            
                            // process tools
                            for(let tool of tool_calls) {
                                
                                let tool_params = JSON.parse(tool.function.arguments)

                                console.log(tool.id, tool.function.name, tool_params)

                                let tool_output = { status: 'error', message: 'function not found' }

                                if(tool.function.name === 'get_weather') {

                                    const mock_temp = (10 + 20 * Math.random()).toFixed(1)

                                    const mock_outlook = ['sunny', 'cloudy', 'rainy']

                                    const mock_chance = Math.floor(mock_outlook.length * Math.random())

                                    tool_output = { status: 'success', outlook: mock_outlook[mock_chance], temperature: mock_temp, unit: 'celsius', ...tool_params }
                                }

                                console.log(tool_output)

                                _messages.push({ 
                                    tool_call_id: tool.id, 
                                    role: 'tool', 
                                    name: tool.function.name, 
                                    content: JSON.stringify(tool_output, null, 2)
                                })
                            }
                            
                            // call stream api
                            let stream = openai.stream({
                                messages: _messages,
                                temperature: 0.2,
                                tools: [
                                    { type: 'function', function: get_weather },
                                ]
                            })

                            let retval = await stream_loop(stream, signal, controller)

                            message_content = retval.message
                            tool_calls = retval.tools

                            if(tool_calls.length === 0) {
                                is_completed = true
                            }

                            loop++
                            if(loop >= max_loop) {
                                console.log("max loop")
                                is_completed = true
                            }

                        } while(!is_completed)

                    }

                } catch(error) {
                    console.log(error.message)
                }

                console.log('end streaming...')

                controller.close()
            },
            }),
            { 
                status: 200, 
                headers: {
                    ...CORS_HEADERS,
                    "Content-Type": "text/event-stream"
                } 
            }
        )


        /*
        console.log(response)

        return new Response(JSON.stringify({
            iat: Date.now(),
            message: response.message
        }), { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } })
        */

    } catch(error) {
        console.log(error.message)
        throw new Error(error.message)
    }

})

route.get('/whisper', async (req) => {

    const filepath = path.join('public', 'uploads', 'sample-nova.mp3')

    if(!Bun.file(filepath).exists()) {
        return new Response(JSON.stringify({
            iat: Date.now(),
            message: 'File not found',
        }), { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } })
    }

    //console.log(filepath)

    try {

        const response = await openai.transcribe({
            file: fs.createReadStream(filepath), //Bun.file(filepath).stream(),
            response_format: 'verbose_json',
            timestamp_granularities: ['word']
        })

        console.log(response)

    } catch(error) {
        console.log(error.message)
    }

    return new Response(JSON.stringify({
        iat: Date.now(),
    }), { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } })

})

export default route.handler