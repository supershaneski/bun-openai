import React from 'react'
import PropTypes from 'prop-types'
import MicIcon from '@mui/icons-material/Mic'
//import MicOffIcon from '@mui/icons-material/MicOff'

import classes from './micbutton.module.css'

function MicButton({
    
    isReady = false,
    isRecording = false,

    disabled = false,
    onClick = undefined
}) {
    let classBackdrop = classes.backdrop
    let classIcon = classes.iconOff
    if(!disabled) {
        if(isRecording) {
            classBackdrop = `${classes.backdrop} ${classes.lineOn}`
        }
        classIcon = !isReady ? classes.icon : classes.iconOn
    }

    return (
        <div className={classes.container}>
            {
                (!disabled && isRecording) &&
                <div className={`${classes.line} ${classes.animated}`}></div>
            }
            <div className={classBackdrop}></div>
            <button disabled={disabled} onClick={onClick} className={classes.button}>
                <MicIcon className={classIcon} />
            </button>
        </div>
    )
}

MicButton.propTypes = {
    /**
     * isReady
     */
    isReady: PropTypes.bool,
    /**
     * isRecording
     */
    isRecording: PropTypes.bool,
    /**
     * disabled
     */
    disabled: PropTypes.bool,
    /**
     * onClick event
     */
    onClick: PropTypes.func,
}


function areEqual(prevProps, nextProps) {

    if(prevProps.isReady !== nextProps.isReady || prevProps.isRecording !== nextProps.isRecording) {
        return false
    }

    return true

}

export default React.memo(MicButton, areEqual)