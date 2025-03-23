import React, { useState, useRef, useEffect } from 'react';

const CorrectionButton = ({ imageData, prediction, doctorId }) => {
  const [showModal, setShowModal] = useState(false);
  const [correctionType, setCorrectionType] = useState(null);
  const [rectangles, setRectangles] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentRectangle, setCurrentRectangle] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [imageElement, setImageElement] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const canvasRef = useRef(null);

  const openCorrectionModal = () => {
    setShowModal(true);
    setCorrectionType(null);
    setRectangles([]);
    setConfirmationMessage("");
  };

  const closeModal = () => {
    setShowModal(false);
    setIsDrawing(false);
    setCorrectionType(null);
    setRectangles([]);
    setConfirmationMessage("");
  };

  const handleImageLoad = (e) => {
    const img = e.target;
    setImageElement(img);
    setCanvasSize({
      width: img.width,
      height: img.height
    });
  };

  const handleMouseDown = (e) => {
    if (correctionType !== "fractured" || !imageElement) return;
    
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentRectangle({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || correctionType !== "fractured" || !currentRectangle || !imageElement) return;
    
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentRectangle({
      x: startPoint.x,
      y: startPoint.y,
      width: x - startPoint.x,
      height: y - startPoint.y
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentRectangle && correctionType === "fractured") {
      setRectangles([...rectangles, currentRectangle]);
      setIsDrawing(false);
      setCurrentRectangle(null);
    }
  };

  const handleCorrectionTypeSelect = (type) => {
    setCorrectionType(type);
    setRectangles([]);
  };

  // Function to capture the current canvas state as an image
  const captureCanvasImage = () => {
    if (!canvasRef.current) return null;
    return canvasRef.current.toDataURL('image/png');
  };

  const submitCorrection = async () => {
    if (!correctionType || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const timestamp = new Date().toISOString();
      
      // Capture original image as base64
      let imageBase64 = null;
      if (typeof imageData === 'string') {
        // If imageData is already a data URL
        imageBase64 = imageData;
      } else if (imageData && imageData.url) {
        // If imageData has a url property
        imageBase64 = imageData.url;
      }
      
      // Capture annotated image if there are rectangles
      const annotatedImageBase64 = rectangles.length > 0 ? captureCanvasImage() : null;
      
      const data = {
        imageId: imageData.id || "unknown",
        originalPrediction: prediction,
        correctionType: correctionType,
        doctorId: doctorId,
        timestamp: timestamp,
        rectangles: correctionType === "fractured" ? rectangles : [],
        imageData: imageBase64,
        annotatedImageData: annotatedImageBase64
      };
      
      const response = await fetch('http://127.0.0.1:5000/submit-correction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit correction');
      }
      
      const result = await response.json();
      setConfirmationMessage(result.message || "Correction submitted successfully");
      
      // Reset rectangles after successful submission
      setRectangles([]);
    } catch (error) {
      console.error("Error submitting correction:", error);
      setConfirmationMessage("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (canvasRef.current && imageElement) {
      const ctx = canvasRef.current.getContext('2d');
      
      // Clear canvas
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      
      // Draw the image
      ctx.drawImage(imageElement, 0, 0, canvasSize.width, canvasSize.height);
      
      // Draw existing rectangles with bright glow effect
      ctx.shadowColor = '#00FF00'; // Bright neon green
      ctx.shadowBlur = 15;
      ctx.strokeStyle = "#00FF00"; // Bright neon green for the stroke
      ctx.lineWidth = 2.5;
      
      rectangles.forEach(rect => {
        ctx.beginPath();
        ctx.rect(rect.x, rect.y, rect.width, rect.height);
        ctx.stroke();
      });
      
      // Draw current rectangle being created
      if (isDrawing && currentRectangle) {
        ctx.beginPath();
        ctx.rect(currentRectangle.x, currentRectangle.y, currentRectangle.width, currentRectangle.height);
        ctx.stroke();
      }
      
      // Reset shadow for other operations
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }, [canvasSize, rectangles, currentRectangle, imageElement, isDrawing]);

  return (
    <div>
      <button 
        onClick={openCorrectionModal}
        className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
      >
        Report Incorrect Classification
      </button>
      
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Correct Classification</h2>
            
            <div className="mb-4">
              <img 
                src={typeof imageData === 'string' ? imageData : (imageData.url || '')} 
                alt="X-ray" 
                className="hidden"
                onLoad={handleImageLoad}
              />
              
              {imageElement && (
                <div className="relative border border-gray-300 inline-block">
                  <canvas 
                    ref={canvasRef}
                    width={canvasSize.width} 
                    height={canvasSize.height}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="cursor-crosshair"
                  />
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <h3 className="font-medium mb-2">Select the correct classification:</h3>
              <div className="flex space-x-4">
                <button
                  onClick={() => handleCorrectionTypeSelect("fractured")}
                  className={`px-4 py-2 rounded ${
                    correctionType === "fractured" 
                      ? "bg-red-600 text-white" 
                      : "bg-gray-200 hover:bg-red-100"
                  }`}
                >
                  Fractured
                </button>
                <button
                  onClick={() => handleCorrectionTypeSelect("no-fracture")}
                  className={`px-4 py-2 rounded ${
                    correctionType === "no-fracture" 
                      ? "bg-green-600 text-white" 
                      : "bg-gray-200 hover:bg-green-100"
                  }`}
                >
                  No Fracture
                </button>
              </div>
            </div>
            
            {correctionType === "fractured" && (
              <div className="mb-4 text-sm text-gray-600">
                Please mark the fracture location(s) on the image by clicking and dragging to create rectangles.
              </div>
            )}
            
            {confirmationMessage && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                {confirmationMessage}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={submitCorrection}
                disabled={!correctionType || isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
              >
                {isSubmitting ? "Submitting..." : "Submit Correction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrectionButton;