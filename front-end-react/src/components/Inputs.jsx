import React from 'react';

export default function Inputs({ webkitdirectory, classesL, classes, placehold, type, text, name, value, onChange }) {
  return (
    <div>
      <label className={classesL}>
        {text ? text : "YOU FORGOT NAME FOR INPUT"}
        <input webkitdirectory={webkitdirectory} className={classes} placeholder={placehold} type={type} name={name} value={value} onChange={onChange} />
      </label>
    </div>
  );
}
