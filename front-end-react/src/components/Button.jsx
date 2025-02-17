import React from 'react'

export default function Button({text, classes, type}) {
  return (
    <div>
      <button className={classes} type={type}>{text}</button>
    </div>
  )
}
