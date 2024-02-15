export const getPathAndFilename = (url) => {
    
    if (url.startsWith('/')) {
        url = url.substring(1)
    }
    
    var segments = url.split('/')

    var lastSegment = segments.pop()

    if (lastSegment.includes('.')) {
        
        url = segments.join('/')

    } else {

        lastSegment = undefined

    }

    if(!url.startsWith('/')) {
        url = '/' + url
    }

    if(url.endsWith('/')) {
        url = url.slice(0, -1)
    }

    if(!url) {
        url = '/'
    }

    return [url, lastSegment]
}

export const isRoute = (relurl, path) => {
    return path === relurl || path.startsWith(`${relurl}/`)
}

export const isEven = (n) => {
    return n % 2 == 0;
}

export const trim_array = ( arr, max_length = 20 ) => {

    let new_arr = arr
    
    if(arr.length > max_length) {
        
        let cutoff = Math.ceil(arr.length - max_length)
        cutoff = isEven(cutoff) ? cutoff : cutoff + 1
        
        new_arr = arr.slice(cutoff)
  
    }
  
    return new_arr
  
}

export const stream_loop = async (stream, signal, controller) => {

    let message_content = ''
    let tool_calls = []

    for await (const data of stream) {

        if(signal.aborted) {
            break
        }

        console.log(JSON.stringify(data))

        if(Object.prototype.hasOwnProperty.call(data.delta, 'content')) {
            
            if(data.delta.content) {
                //res.write(data.delta.content)
                controller.write(data.delta.content)
                message_content += data.delta.content
            }

        }

        if(Object.prototype.hasOwnProperty.call(data.delta, 'tool_calls')) {

            let tmp_call = data.delta.tool_calls[0]
            
            if(Object.prototype.hasOwnProperty.call(tmp_call, 'id')) {

                //res.write("Sure, please wait...")
                tool_calls.push(tmp_call)

            } else {
                
                tool_calls = tool_calls.map((tool) => {
                    return {
                        ...tool,
                        function: {
                            name: tool.function.name,
                            arguments: tool.index === tmp_call.index ? tool.function.arguments + tmp_call.function.arguments : tool.function.arguments
                        }
                    }
                })

            }

        }

        await controller.flush()

    }

    return {
        message: message_content,
        tools: tool_calls
    }
}