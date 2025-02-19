import React, { useState } from 'react';

export default function PredictXray() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create a preview URL for the image
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result);
      };
      fileReader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError("Please select an X-ray image first");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('xray_image', file);

      const response = await fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to get prediction');
      }

      const result = await response.json();
      setPrediction(result);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">X-ray Fracture Detection</h1>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label className="block mb-2 font-medium">Upload X-ray Image</label>
          <input 
            type="file" 
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Processing...' : 'Predict'}
        </button>
      </form>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Preview uploaded image */}
        {previewUrl && (
          <div className="border rounded p-4">
            <h2 className="font-medium mb-2">Uploaded Image</h2>
            <img 
              src={previewUrl} 
              alt="X-ray preview" 
              className="w-full h-auto object-contain max-h-64"
            />
          </div>
        )}

        {/* Show prediction results */}
        {prediction && (
          <div className={`border rounded p-4 ${prediction.fracture_detected ? 'bg-red-50' : 'bg-green-50'}`}>
            <h2 className="font-medium mb-2">Prediction Result</h2>
            <div className="text-lg font-bold">
              {prediction.fracture_detected ? 'Fracture Detected' : 'No Fracture Detected'}
            </div>
            <div className="mt-2">
              Confidence: {(prediction.confidence * 100).toFixed(2)}%
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Processed in {prediction.processing_time.toFixed(2)} seconds
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
