import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
    timeout: 60 * 1000
})

export async function chat({
    model = 'gpt-3.5-turbo-0125',
    max_tokens = 2048,
    temperature = 0,
    messages,
    tools,
    response_format, // { type: "json_object" },
}) {

    let options = { 
        messages, 
        model, 
        temperature, 
        max_tokens 
    }

    if(tools) {
        options.tools = tools
    }

    if(response_format) {
        options.response_format = response_format
    }

    try {

        const result = await openai.chat.completions.create(options)

        console.log(result)

        return result.choices[0]

    } catch(error) {
        
        console.log(error.name, error.message)

        throw error
    }

}

export async function* stream({
    model = 'gpt-3.5-turbo-0125',
    max_tokens = 2048,
    temperature = 0,
    messages,
    tools,
    response_format, // { type: "json_object" },
}) {

    let options = { 
        messages, 
        model, 
        temperature, 
        max_tokens,
        stream: true
    }

    if(tools) {
        options.tools = tools
    }

    if(response_format) {
        options.response_format = response_format
    }

    try {

        const result = await openai.chat.completions.create(options)

        for await (const chunk of result) {

            yield chunk.choices[0]

        }

    } catch(error) {
        
        console.log(error.name, error.message)

        throw error
    }

}

export async function transcribe({
    file,
    model = 'whisper-1',
    language = 'en',
    prompt = '',
    response_format = 'json',
    temperature = 0,
    timestamp_granularities = [],
}) {

    try {

        let options = {
            file,
            model,
            prompt,
            response_format,
            temperature,
            language,
        }

        if(timestamp_granularities) {
            options.timestamp_granularities = timestamp_granularities
            options.response_format = 'verbose_json' // force
        }

        //console.log(options)

        return await openai.audio.transcriptions.create(options)

    } catch(error) {
        
        //console.log(error.name, error.message)
        console.log('whisper', error)

        throw error
    }
}