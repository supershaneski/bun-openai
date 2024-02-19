import { getPathAndFilename } from "./utils"

class Router {
    constructor(root_dir) {

        this.root_dir = root_dir || '/'
        this.routes = []
        this.html = '<pre>404 Error: Page Not Found</pre>'

        this.post = this.post.bind(this)
        this.get = this.get.bind(this)
        this.error = this.error.bind(this)
        this.handler = this.handler.bind(this)
    }

    error(callback) {
        let result = callback()
        if (typeof result !== 'string') {
            throw new Error('Callback function must return a string')
        }
        this.html = result
    }
    
    post(route, callback) {
        this.routes.push({
            route,
            callback,
            method: 'POST'
        })
    }

    get(route, callback) {
        this.routes.push({
            route,
            callback,
            method: 'GET'
        })
    }

    handler(req) {

        console.log('route handler')
        
        const { pathname } = new URL(req.url)

        const [ dirpath, filename ] = getPathAndFilename(pathname)
        
        if(dirpath.startsWith(this.root_dir)) {

            let searchpath = dirpath.replace(this.root_dir, '')
            if(!searchpath.startsWith('/')) {
                searchpath = '/' + searchpath
            }

            for(let i = 0; i < this.routes.length; i++) {

                if(req.method !== this.routes[i].method) continue
                
                if(searchpath !== this.routes[i].route) continue
    
                return this.routes[i].callback(req, filename)
    
            }

        }

        return new Response(this.html, { status: 404, headers: { "Content-Type": "text/html" } })
        
    }

}

export default Router