import React from 'react'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'

import SendIcon from '@mui/icons-material/Send'
import ClearIcon from '@mui/icons-material/Clear'
import MicOffIcon from '@mui/icons-material/MicOff'
import RestartIcon from '@mui/icons-material/RestartAlt'
import AccountIcon from '@mui/icons-material/AccountCircle'

import LoadingText from './components/loadingtext'
import OpenAiIcon from './components/openaiicon'
import MicButton from './components/micbutton'

import { storeMessages, getStoredMessages, getDatetime } from './lib/utils'

import classes from './App.module.css'

const MIN_DECIBELS = -70

class App extends React.Component {

  constructor(props) {
    
    super(props)

    this.abortControllerRef = React.createRef()
    this.audioDomRef = React.createRef()
    this.inputRef = React.createRef()
    this.messageRef = React.createRef()

    let default_messages = getStoredMessages()

    this.state = {
      isVoiceEnabled: false,
      isMicOn: false,
      isRecording: false,
      isSpeaking: false,
      
      isLoading: false,
      isLoadingText: false,
      isComposing: false,
      isCountDown: false,

      inputText: '',

      messageItems: default_messages,
    }

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
    this.scrollToTop = this.scrollToTop.bind(this)

    this.handleAudioLoad = this.handleAudioLoad.bind(this)
    this.handleAudioError = this.handleAudioError.bind(this)
    this.handleAudioEnded = this.handleAudioEnded.bind(this)

    this.handleReset = this.handleReset.bind(this)

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

    const blob = new Blob(this.chunks, { type: 'audio/webm;codecs=opus' })
    const name = `file${Date.now()}` + Math.round(Math.random() * 100000) + `.webm`
    const file = new File([blob], name, { type: 'audio/webm' })
    
    console.log(file)

    this.chunks = []

    if(file.size === 0) return

    console.log('send audio data...', (new Date()).toLocaleTimeString())

    try {

      this.setState({
        isLoading: true
      })

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
      
    } catch(error) {

      console.log(error.message)
      
    } finally {

      this.setState({
        isLoading: false
      })
      
      console.log("end voice")
      
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

    await this.submitQuery(text)

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
        id: Date.now(),
        role: 'user',
        content: message
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

      const assistant_id = Date.now()

      const new_assistant_message = {
        id: assistant_id,
        role: 'assistant',
        content: ''
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
      
      //localStorage.setItem('bun/openai/message/items', JSON.stringify(this.state.messageItems))
      
      this.setState({
        isLoading: false,
        isLoadingText: false,
      })

      setTimeout(() => {
        
        //localStorage.setItem('bun/openai/message/items', JSON.stringify(this.state.messageItems))
        storeMessages(this.state.messageItems)

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

  render() {

    /*
      <MicButton mode={this.state.isMicOn ? 1 : this.state.isRecording ? 2 : 0} disabled={!this.state.isVoiceEnabled || this.state.isLoading} onClick={this.handleMic} />
                  
    */

    return (
      <div className={classes.container}>
        <div className={classes.header}>
          <IconButton disabled={this.state.messageItems.length === 0} onClick={this.handleReset}>
            <RestartIcon />
          </IconButton>
        </div>
        <div className={classes.main}>
          <div ref={this.messageRef} className={classes.messages}>
          {
            this.state.messageItems.map((item) => {
              const classDiv = item.role === 'user' ? `${classes.message} ${classes.user}` : classes.message
              return (
                <div key={item.id} className={classDiv}>
                  <div className={classes.avatar}>
                    {
                      item.role === 'user' ? <AccountIcon /> : <OpenAiIcon />
                    }
                  </div>
                  <div className={classes.textpanel}>
                    <div className={classes.text}>
                      <div className={classes.textContent}>{item.content}</div>
                      <div className={classes.datetime}>{getDatetime(item.id)}</div>
                    </div>
                  </div>
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
      </div>
    )

  }

}

export default App
