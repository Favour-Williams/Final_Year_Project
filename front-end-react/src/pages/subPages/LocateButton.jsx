import React, { useState } from 'react';

export default function LocateButton({ imageFile, predictionResult }) {
  const [localization, setLocalization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLocate = async () => {
    if (!imageFile || !predictionResult?.fracture_detected) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('xray_image', imageFile);

      const response = await fetch('http://127.0.0.1:5000/locate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to localize fracture');
      }

      const result = await response.json();
      setLocalization(result);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      {predictionResult?.fracture_detected && (
        <button
          onClick={handleLocate}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-green-300 mt-2"
        >
          {loading ? 'Localizing...' : 'Locate Fracture'}
        </button>
      )}

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded mt-2">
          {error}
        </div>
      )}

      {localization && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Fracture Localization</h3>
          <div className="border rounded p-2">
            <img 
              src={localization.result_image} 
              alt="Fracture localization" 
              className="w-full h-auto object-contain max-h-64"
            />
            <p className="mt-2 text-sm text-gray-600">
              {localization.localization_boxes.length} potential fracture sites identified
            </p>
          </div>
        </div>
      )}
    </div>
  );
}