import React from 'react'

export default function TrainModel() {
  return (
    <div>
      <form>
        <h1>train model</h1>
        <label>Please upload dataset</label>
        <input type='file'/>

        <label>Path to train</label>
        <input type='text'/>

        <label>Path to test</label>
        <input type='text'/>

        <label>Path to valid (Optional)</label>
        <input type='text'/>

        <label>Number of epoch</label>
        <input type='number' min={1}/>

        <button>train</button>
      </form>


    </div>
  )
}
