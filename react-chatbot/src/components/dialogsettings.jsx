import React from 'react'
import PropTypes from 'prop-types'

import Button from '@mui/material/Button'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
//import Typography from '@mui/material/Typography'

import classes from './dialogsettings.module.css'

export default function DialogSettings({
    defApiMode = 'chat-api-streaming',
    onConfirm = undefined,
    onClose = undefined
}) {

    const [apiMode, setApiMode] = React.useState(defApiMode)

    React.useEffect(() => {

        setApiMode(defApiMode)

    }, [defApiMode])

    const handleApiModeChange = (e) => {
        setApiMode(e.target.value)
    }

    const handleOK = () => {
        onConfirm(apiMode)
    }

    return (
        <div className={classes.container}>
            <div className={classes.dialog}>
                <div className={classes.content}>
                    <FormControl>
                        <FormLabel id="demo-radio-buttons-group-label">API Mode</FormLabel>
                        <RadioGroup
                            aria-labelledby="demo-radio-buttons-group-label"
                            value={apiMode}
                            onChange={handleApiModeChange}
                            name="radio-buttons-group"
                        >
                            <FormControlLabel value="chat-api" control={<Radio />} label="Chat Completions" />
                            <FormControlLabel value="chat-api-streaming" control={<Radio />} label="Chat Completions with streaming" />
                            <FormControlLabel disabled={true} value="assistant-api" control={<Radio />} 
                            //label="Assistants API with mock streaming"
                            label={<span>Assistants API with <strong>mock</strong> streaming</span>}
                            />
                        </RadioGroup>
                    </FormControl>
                </div>
                <div className={classes.action}>
                    <Button variant="text" onClick={onClose}>Cancel</Button>
                    <Button variant="text" onClick={handleOK}>OK</Button>
                </div>
            </div>
        </div>
    )
}

DialogSettings.propTypes = {
    /**
     * defApiMode modes
     */
    defApiMode: PropTypes.string,
    /**
     * onConfirm handler
     */
    onConfirm: PropTypes.func,
    /**
     * onClose handler
     */
    onClose: PropTypes.func,
}