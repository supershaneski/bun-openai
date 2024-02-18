import React from 'react'
import { createPortal } from 'react-dom'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'

import SettingsIcon from '@mui/icons-material/Settings'
import SendIcon from '@mui/icons-material/Send'
import ClearIcon from '@mui/icons-material/Clear'
import MicOffIcon from '@mui/icons-material/MicOff'
import RestartIcon from '@mui/icons-material/RestartAlt'
import AccountIcon from '@mui/icons-material/AccountCircle'

import DialogSettings from './components/dialogsettings'
import LoadingText from './components/loadingtext'
import OpenAiIcon from './components/openaiicon'
import MicButton from './components/micbutton'

import { getStorageData, setStorageData, 
  //storeMessages, 
  //getStoredMessages, 
  getUniqueId,
  getDatetime, 
  formatDatetime } from './lib/utils'

import classes from './App.module.css'

const MIN_DECIBELS = -50

class App extends React.Component {

  constructor(props) {
    
    super(props)

    this.abortControllerRef = React.createRef()
    this.audioDomRef = React.createRef()
    this.inputRef = React.createRef()
    this.messageRef = React.createRef()

    // simple persistent data
    let default_messages = getStorageData('/message/items', []) //getStoredMessages()
    let default_api_mode = getStorageData('/api/mode', 'chat-api-streaming')

    this.state = {
      isVoiceEnabled: false,
      isMicOn: false,
      isRecording: false,
      isSpeaking: false,
      
      isLoading: false,
      isLoadingText: false,
      isComposing: false,
      isCountDown: false,
      isSettingsShown: false,
      
      inputText: '',

      messageItems: default_messages,

    }

    this.apiMode = default_api_mode //'chat-api-streaming'

    this.timer = null
    this.count = 0

    this.mediaRecorder = null
    this.chunks = []
    this.animFrame = null
    this.synthesizer = null

    this.baseUrl = `${import.meta.env.VITE_SERVER_PROTOCOL}://${import.meta.env.VITE_SERVER_HOST}:${import.meta.env.VITE_SERVER_PORT}`

    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleMic = this.handleMic.bind(this)
    
    this.handleStartComposition = this.handleStartComposition.bind(this)
    this.handleEndComposition = this.handleEndComposition.bind(this)

    this.handleStream = this.handleStream.bind(this)
    this.handleError = this.handleError.bind(this)
    this.handleData = this.handleData.bind(this)
    this.handleStop = this.handleStop.bind(this)
    this.procAudioData = this.procAudioData.bind(this)
    this.procCountDown = this.procCountDown.bind(this)
    this.submitQuery = this.submitQuery.bind(this)
    this.submitQueryStream = this.submitQueryStream.bind(this)
    this.scrollToTop = this.scrollToTop.bind(this)

    this.handleAudioLoad = this.handleAudioLoad.bind(this)
    this.handleAudioError = this.handleAudioError.bind(this)
    this.handleAudioEnded = this.handleAudioEnded.bind(this)

    this.handleReset = this.handleReset.bind(this)
    this.handleSettings = this.handleSettings.bind(this)
    this.handleCloseSettings = this.handleCloseSettings.bind(this)
    this.handleUpdateSettings = this.handleUpdateSettings.bind(this)

  }

  componentDidMount() {
    
    this.abortControllerRef.current = new AbortController()

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        
      navigator.mediaDevices.getUserMedia({ audio: true }).then(this.handleStream).catch(this.handleError)

      this.synthesizer = window.speechSynthesis

      this.audioDomRef.current = new Audio()
      this.audioDomRef.current.type = 'audio/mpeg'
      this.audioDomRef.current.addEventListener('loadedmetadata', this.handleAudioLoad)
      this.audioDomRef.current.addEventListener('ended', this.handleAudioEnded)
      this.audioDomRef.current.addEventListener('error', this.handleAudioError)
      
      this.setState({
        isVoiceEnabled: true
      })

    } else {

      console.log('Voice call not supported')

    }

    if(this.state.messageItems.length > 0) {
      this.scrollToTop()
    }

  }

  componentWillUnmount() {
    
    try {
      
      if(this.abortControllerRef.current) {
        this.abortControllerRef.current.abort()
      }

      window.cancelAnimationFrame(this.animFrame)

      if(this.mediaRecorder?.state && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
      }

      this.synthesizer.cancel()

      this.audioDomRef.current.pause();
      this.audioDomRef.current.currentTime = 0;

    } catch(error) {
      console.log(error.message)
    }

  }

  handleError(error) {
    console.log('Error', error)
  }

  handleStream(stream) {
    
    let options = {
      audioBitsPerSecond: 128000,
      mimeType: 'audio/webm;codecs=opus',
    }

    try {

      this.mediaRecorder = new MediaRecorder(stream, options)

    } catch(error) {

      console.log(error.message)

      // assuming the mimetype fails
      options = {
        audioBitsPerSecond: 128000,
      }

      this.mediaRecorder = new MediaRecorder(stream, options)

    } finally {

      this.mediaRecorder.addEventListener('dataavailable', this.handleData)
      this.mediaRecorder.addEventListener("stop", this.handleStop)

      this.procAudioData(stream)

    }

  }

  procAudioData(stream) {
    
    const audioContext = new AudioContext()
    const audioStreamSource = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.maxDecibels = -10
    analyser.minDecibels = MIN_DECIBELS
    audioStreamSource.connect(analyser)

    const bufferLength = analyser.frequencyBinCount
    const domainData = new Uint8Array(bufferLength)

    const detectSound = () => {

      let soundDetected = false

      analyser.getByteFrequencyData(domainData)

      for (let i = 0; i < bufferLength; i++) {
        if (domainData[i] > 0) {
          soundDetected = true
        }
      }

      if(soundDetected) {

        if(this.state.isMicOn) {
          if(!this.state.isSpeaking) {

            if(this.state.isRecording) {
              
              if(this.state.isCountDown) {

                clearInterval(this.timer)

                this.setState({
                  isCountDown: false,
                })

                this.count = 0

              }

            } else {

              if(!this.state.isLoading) {

                this.setState({
                  isRecording: true
                })
  
                if(this.mediaRecorder?.state && this.mediaRecorder.state !== 'recording') {
                  this.mediaRecorder.start()
                }

              }

            }

          }
        }

      } else {

        if(this.state.isMicOn) {
          if(!this.state.isSpeaking) {

            if(this.state.isRecording) {

              if(this.state.isCountDown) {

                if(this.count >= 2500) {

                  if(this.mediaRecorder?.state && this.mediaRecorder.state !== 'inactive') {
                    this.mediaRecorder.stop()
                  }

                  clearInterval(this.timer)

                  this.count = 0

                  this.setState({
                    isRecording: false,
                    isCountDown: false,
                  })

                }

              } else {
                
                this.setState({
                  isCountDown: true
                })

                this.procCountDown()

              }

            }

          }
        }

      }

      this.animFrame = window.requestAnimationFrame(detectSound)

    }

    this.animFrame = window.requestAnimationFrame(detectSound)

  }

  procCountDown() {
    clearInterval(this.timer)
    
    this.count = 0

    this.timer = setInterval(() => {

      this.count += 100

    }, 100)
  }

  handleAudioLoad() {
    //
  }

  handleAudioError() {
    console.log('Error playing audio file')
  }

  handleAudioEnded() {
    //
  }

  handleData(e) {
    this.chunks.push(e.data)
  }

  async handleStop() {
    
    console.log("stop", (new Date()).toLocaleTimeString())

    if(this.state.isLoading) return

    const blob = new Blob(this.chunks, { type: 'audio/webm;codecs=opus' })
    const name = `file${Date.now()}` + Math.round(Math.random() * 100000) + `.webm`
    const file = new File([blob], name, { type: 'audio/webm' })
    
    console.log(file)

    this.chunks = []

    if(file.size === 0) return

    console.log('send audio data...', (new Date()).toLocaleTimeString())

    this.setState({
      isLoading: true
    })

    try {
      
      let formData1 = new FormData()
      formData1.append('file', file, name)
      formData1.append('name', name)

      const response = await fetch(`${this.baseUrl}/transcribe`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json'
          },
          body: formData1,
          signal: this.abortControllerRef.current.signal,
      })

      const result = await response.json()

      console.log('voice', result, (new Date()).toLocaleTimeString())

      if(result.text) {

        /*
        this.setState({
          isLoadingText: true,
        })
    
        this.scrollToTop()

        await this.submitQuery(result.text)
        */

        this.setState({
          isLoading: false
        })

      } else {

        this.setState({
          isLoading: false
        })

      }
      
    } catch(error) {

      console.log(error.message)

      this.setState({
        isLoading: false
      })
      
    }

  }
  
  async handleSubmit(e) {
    e.preventDefault()

    if(this.state.isLoading) return

    if(this.state.inputText.length < 2) return

    console.log("submit...")

    const text = this.state.inputText

    this.setState({
      inputText: '',
      isLoading: true,
      isLoadingText: true,
    })

    this.scrollToTop()

    if(this.apiMode === 'chat-api') {

      await this.submitQuery(text)

    } else {

      await this.submitQueryStream(text)

    }

  }

  async submitQuery(query = '') {
    
    let previous = this.state.messageItems.filter((item) => item.role === 'user' || item.role === 'assistant').map((item) => {
      return {
        role: item.role,
        content: item.content,
      }
    })
    
    let message = query

    if(message) {

      const new_user_message = {
        id: getUniqueId(),
        role: 'user',
        content: message,
        created_at: Date.now()
      }

      this.setState((prev) => ({
        messageItems: [...prev.messageItems, ...[new_user_message]],
      }))

      this.scrollToTop()

    }

    try {

      let assistant_id = getUniqueId()

      let new_assistant_message = {
        id: assistant_id,
        role: 'assistant',
        content: '',
        created_at: Date.now()
      }

      this.setState((prev) => ({
        messageItems: [...prev.messageItems, ...[new_assistant_message]],
      }))

      let is_completed = false
      let max_loop = 30
      let count = 0

      let tool_calls = []

      do {

        console.log('Loop', count)

        let payload = { previous }
        let relurl = 'chat'

        if(tool_calls.length > 0) {

          payload.tool_calls = tool_calls
          relurl = 'chat/tools'

        } else {

          payload.query = message

        }
        
        const response = await fetch(`${this.baseUrl}/${relurl}`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            previous,
            query: message,
            tool_calls,
          })
        })

        if(!response.ok) {
          console.log('Oops, an error occurred', response.status)
        }

        const result = await response.json()

        console.log(result.message)

        if(result.message.content) {

          this.setState((prev) => ({
            messageItems: prev.messageItems.map((item) => {
              let item_content = item.content
              if(item.id === assistant_id) {
                item_content = item_content ? item.content + '\n' + result.message.content : result.message.content
              }
              return {
                ...item,
                content: item_content
              }
            })
          }))

          this.scrollToTop()

        }

        if(result.message.tool_calls) {

          if(message) { // first query

            previous.push({ role: 'user', content: message })

            message = ''

          }

          if(result.message.content) {

            previous.push({ role: 'assistant', content: result.message.content })
  
          }

          tool_calls = result.message.tool_calls

        } else {

          is_completed = true

        }

        count++

        if(count >= max_loop) {
          is_completed = true
        }

      } while(!is_completed)
      
    } catch(error) {
      
      console.log(error.message)

    } finally {
      
      this.setState({
        isLoading: false,
        isLoadingText: false,
      })

      setTimeout(() => {
        
        // store data in persistent storage
        //storeMessages(this.state.messageItems)
        setStorageData('/message/items', this.state.messageItems)

        this.inputRef.current.focus()

      }, 300)

    }

  }
  
  async submitQueryStream(query = '') {
    
    let previous = this.state.messageItems.filter((item) => item.role === 'user' || item.role === 'assistant').map((item) => {
      return {
        role: item.role,
        content: item.content,
      }
    })
    
    let message = query

    if(message) {

      const new_user_message = {
        id: getUniqueId(),
        role: 'user',
        content: message,
        created_at: Date.now()
      }

      this.setState((prev) => ({
        messageItems: [...prev.messageItems, ...[new_user_message]],
      }))

      this.scrollToTop()

    }

    try {

      const response = await fetch(`${this.baseUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: message,
          previous
        })
      })

      const reader = response.body.getReader()

      const assistant_id = getUniqueId()

      const new_assistant_message = {
        id: assistant_id,
        role: 'assistant',
        content: '',
        created_at: Date.now()
      }
      
      this.setState((prev) => ({
        messageItems: [...prev.messageItems, ...[new_assistant_message]],
        isLoadingText: false,
      }))

      let is_completed = false
      let text_data = ''

      while(!is_completed) {

        const { done, value } = await reader.read()

        if(done) {

          console.log('stream ended...', (new Date()).toLocaleTimeString())

          is_completed = true
          break
        }

        text_data += new TextDecoder().decode(value)

        //this.scrollToTop()

        this.setState((prev) => ({
          messageItems: prev.messageItems.map((item) => {
            return {
              ...item,
              content: item.id === assistant_id ? text_data : item.content
            }
          })
        }))

        this.scrollToTop()

      }
    } catch(error) {
      
      console.log(error.message)

    } finally {
      
      this.setState({
        isLoading: false,
        isLoadingText: false,
      })

      setTimeout(() => {
        
        // store data in persistent storage
        //storeMessages(this.state.messageItems)
        setStorageData('/message/items', this.state.messageItems)

        this.inputRef.current.focus()

      }, 300)

    }

    

  }

  scrollToTop() {

    setTimeout(() => {

      this.messageRef.current.scrollTop = this.messageRef.current.scrollHeight

    }, 200)

  }

  handleMic(e) {
    e.preventDefault()
    
    if(this.state.isMicOn) {
      
      if(this.mediaRecorder?.state && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
      }

      this.setState({
        isRecording: false,
        isMicOn: false,
      })

    } else {

      this.setState({
        isMicOn: true,
      })

    }

  }

  handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      if(!this.state.isComposing) {
        this.handleSubmit(e)
      }
    }
  }

  handleStartComposition() {
    this.setState({
      isComposing: true
    })
  }

  handleEndComposition() {
    this.setState({
      isComposing: false
    })
  }

  handleReset() {

    this.setState({
      messageItems: [],
    })


    localStorage.setItem('bun/openai/message/items', JSON.stringify([]))
    
  }

  handleSettings() {
    
    this.setState({
      isSettingsShown: true,
    })

  }

  handleCloseSettings() {

    this.setState({
      isSettingsShown: false,
    })

  }

  handleUpdateSettings(mode) {

    console.log(mode)

    this.apiMode = mode

    this.setState({
      isSettingsShown: false,
    })
    
    setStorageData('/api/mode', mode)

  }

  render() {

    let display_data = []
    let sdatetime = ''
    this.state.messageItems.forEach((item, index) => {

      const raw_datetime = item.created_at
      const datetime = formatDatetime(item.created_at)
      
      if(index === 0) {
        
        sdatetime = datetime

        display_data.push({ id: raw_datetime, role: 'datetime', content: sdatetime, created_at: raw_datetime })
        display_data.push(item)

      } else {

        if(datetime !== sdatetime) {
          
          sdatetime = datetime

          display_data.push({ id: raw_datetime, role: 'datetime', content: sdatetime, created_at: raw_datetime })
          display_data.push(item)

        } else {
          display_data.push(item)
        }

      }

    })


    return (
      <div className={classes.container}>
        <div className={classes.header}>
          <IconButton disabled={this.state.messageItems.length === 0} onClick={this.handleReset}>
            <RestartIcon />
          </IconButton>
          <IconButton onClick={this.handleSettings} disabled={this.state.isLoading || this.state.isLoadingText || this.state.isRecording || this.state.isSpeaking}>
            <SettingsIcon />
          </IconButton>
        </div>
        <div className={classes.main}>
          <div ref={this.messageRef} className={classes.messages}>
          {
            display_data.map((item) => {

              const classDiv = item.role === 'user' ? `${classes.message} ${classes.user}` : item.role === 'assistant' ? classes.message : classes.datelabel
              
              return (
                <div key={item.id} className={classDiv}>
                  {
                    item.role === 'datetime' &&
                    <div className={classes.datelabeltext}>{getDatetime(item.content, 1)}</div>
                  }
                  {
                    item.role !== 'datetime' &&
                    <>
                      <div className={classes.avatar}>
                        {
                          item.role === 'user' ? <AccountIcon /> : <OpenAiIcon />
                        }
                      </div>
                      <div className={classes.textpanel}>
                        <div className={classes.text}>
                          <div className={classes.textContent}>{item.content ? item.content : '...'}</div>
                          <div className={classes.datetime}>{getDatetime(item.created_at)}</div>
                        </div>
                      </div>
                    </>
                  }
                </div>
              )
            })
          }
          {
            this.state.isLoadingText &&
            <div className={classes.loading}>
              <LoadingText />
            </div>
          }
          </div>
        </div>
        <div className={classes.control}>
          <div className={classes.input}>
            <Box 
            component='form' 
            onSubmit={this.handleSubmit} 
            autoComplete='off'
            noValidate>
              <TextField
              className={classes.inputText}
              disabled={this.state.isMicOn || this.state.isLoading}
              fullWidth
              multiline
              autoFocus
              //minRows={1}
              maxRows={3}
              inputRef={this.inputRef}
              value={this.state.inputText}
              placeholder='Write your message'
              onChange={(e) => this.setState({ inputText: e.target.value })}
              onKeyDown={this.handleKeyDown}
              onCompositionStart={this.handleStartComposition}
              onCompositionEnd={this.handleEndComposition}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    {
                      !this.state.isVoiceEnabled &&
                      <IconButton disabled={true}>
                        <MicOffIcon />
                      </IconButton>
                    }
                    {
                      this.state.isVoiceEnabled &&
                      <MicButton isReady={this.state.isMicOn} isRecording={this.state.isRecording} disabled={this.state.isLoading} onClick={this.handleMic} />
                    }
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton 
                    onClick={() => this.setState({ inputText: '' })}
                    disabled={!this.state.inputText || this.state.isMicOn || this.state.isLoading}
                    >
                      <ClearIcon fontSize='inherit' />
                    </IconButton>
                    <IconButton 
                    onClick={(e) => this.handleSubmit(e)} 
                    disabled={!this.state.inputText || this.state.isMicOn || this.state.isLoading}
                    >
                      <SendIcon fontSize='inherit' />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              />
            </Box>
          </div>
        </div>
        {
          this.state.isSettingsShown && createPortal(
            <DialogSettings 
            defApiMode={this.apiMode}
            onConfirm={this.handleUpdateSettings}
            onClose={this.handleCloseSettings}
            />,
            document.body,
          )
        }
      </div>
    )

  }

}

export default App
