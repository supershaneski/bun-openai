react-chatbot
===========

This is a sample chatbot application built using [Vite + React](https://vitejs.dev/guide/) and powered by OpenAI API.


# Application

![Screenshot](./docs/screenshot1.png)

The chatbot application uses ***streaming*** for better user experience and is equipped with ***function calling***.

I am using the latest model, `gpt-3.5-turbo-0125`, which can handle parallel function calling.

As of now, it just have one sample function, `get_weather`:

```javascript
{
    "name": "get_weather",
    "description": "Get the weather for a specified location and date",
    "parameters": {
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "The city, e.g. Tokyo, New York"
            },
            "date": {
                "type": "string",
                "description": "The date for the weather forecast, e.g. today, 2023-10-19"
            }
        },
        "required": ["location", "date"]
    }
}
```

I will add more functions in the future.

Currently, there is no external API where we get the actual weather.


# Setup

Copy `.env.example` and rename it to `.env` then edit values according to your own configuration.
Please note that this should coincide with your [server setup](/server/README.md#setup).

```sh
VITE_SERVER_HOST=192.168.0.1
VITE_SERVER_PORT=3000
VITE_SERVER_PROTOCOL=https
```

To run the application

```bash
bun start
``

Open your browser to `http://localhost:5173/` to load the application page.
