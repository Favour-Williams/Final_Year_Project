import React, { useState, useRef, useCallback, useEffect } from 'react';
import '../../styles/sortfile.css'
import { useLocation } from 'react-router-dom';

export default function SortFile() {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [threshold, setThreshold] = useState(0.3); // Add threshold state
  const formRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const location = useLocation();
  const doctorId = location.state?.doctorId || "unknown";
  const doctorName = location.state?.doctorName || "unknown";
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setError(null);
    setDownloadUrl(null);
  };
  
  // Optimized file upload with chunks for larger files
  const uploadFiles = async (files, onProgress) => {
    const formData = new FormData();
    
    // Add all files to the form data
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Add other parameters
    formData.append('doctorId', doctorId);
    formData.append('threshold', threshold);
    
    // Create and configure the request
    const xhr = new XMLHttpRequest();
    
    // Setup progress tracking
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentCompleted = Math.round((event.loaded * 100) / event.total);
        onProgress(percentCompleted);
      }
    });
    
    // Return a promise that resolves when the upload completes
    return new Promise((resolve, reject) => {
      xhr.open('POST', 'http://localhost:5000/upload-xrays');
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      setError("Please select files to process");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setProcessingProgress(0);
    setError(null);
    
    try {
      // Upload files with progress tracking
      const uploadResult = await uploadFiles(selectedFiles, setUploadProgress);
      
      setIsUploading(false);
      setIsProcessing(true);
      
      // Start polling for processing progress
      const sessionId = uploadResult.session_id;
      
      // Clear any existing interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      
      // Start polling with dynamic frequency based on file count
      const pollFrequency = Math.max(500, Math.min(2000, selectedFiles.length * 20));
      
      pollIntervalRef.current = setInterval(async () => {
        try {
          const progressResponse = await fetch(`http://localhost:5000/processing-status/${sessionId}`);
          
          if (!progressResponse.ok) {
            throw new Error(`Error checking status: ${progressResponse.statusText}`);
          }
          
          const progressData = await progressResponse.json();
          setProcessingProgress(progressData.progress);
          
          if (progressData.status === 'completed') {
            clearInterval(pollIntervalRef.current);
            setIsProcessing(false);
            setDownloadUrl(`http://localhost:5000/download-results/${sessionId}`);
            setStats(progressData.stats);
          } else if (progressData.status === 'failed') {
            clearInterval(pollIntervalRef.current);
            setIsProcessing(false);
            setError(progressData.error || 'Processing failed');
          }
        } catch (err) {
          console.error("Error polling for status:", err);
          // Don't clear interval on transient errors
          if (err.message.includes("not found")) {
            clearInterval(pollIntervalRef.current);
            setIsProcessing(false);
            setError("Processing session not found");
          }
        }
      }, pollFrequency);
      
    } catch (err) {
      setIsUploading(false);
      setIsProcessing(false);
      setError(err.message || 'Something went wrong');
    }
  };

  const resetForm = () => {
    if (formRef.current) {
      formRef.current.reset();
    }
    setSelectedFiles([]);
    setDownloadUrl(null);
    setStats(null);
    setError(null);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Sort X-ray Images</h1>
      
      <form ref={formRef} onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label className="block mb-2 font-medium">Upload X-ray Images Folder</label>
          <input 
            type="file" 
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={handleFileChange}
            className="block w-full border border-gray-300 rounded px-3 py-2"
          />
          {selectedFiles.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              {selectedFiles.length} files selected
            </div>
          )}
        </div>
        
        {/* Add threshold slider */}
        <div className="mb-4">
          <label className="block mb-2 font-medium">
            Fracture Detection Threshold: {threshold}
          </label>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>More Sensitive (0.1)</span>
            <span>More Specific (0.9)</span>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            type="submit" 
            disabled={isUploading || isProcessing || selectedFiles.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isUploading ? "Uploading..." : isProcessing ? "Processing..." : "Process Files"}
          </button>
          
          {(downloadUrl || error) && (
            <button 
              type="button"
              onClick={resetForm}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
            >
              Start New Batch
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded mb-4">
          {error}
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="mb-6">
          <h2 className="font-medium mb-2">Uploading Files...</h2>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {uploadProgress}% complete
          </div>
        </div>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <div className="mb-6">
          <h2 className="font-medium mb-2">Processing X-ray Images...</h2>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-green-600 h-4 rounded-full transition-all duration-300" 
              style={{ width: `${processingProgress}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {processingProgress}% complete
          </div>
        </div>
      )}

      {/* Download Section with Enhanced Stats */}
      {downloadUrl && (
        <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
          <h2 className="font-medium text-lg mb-3">Processing Complete!</h2>
          
          {stats && (
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded shadow-sm">
                <div className="text-sm text-gray-600">Fractures Detected</div>
                <div className="text-xl font-bold">{stats.fracture_count}</div>
                <div className="text-xs text-gray-500">
                  {stats.total > 0 ? `(${(stats.fracture_count / stats.total * 100).toFixed(1)}%)` : '0%'}
                </div>
              </div>
              <div className="p-3 bg-white rounded shadow-sm">
                <div className="text-sm text-gray-600">No Fractures</div>
                <div className="text-xl font-bold">{stats.no_fracture_count}</div>
                <div className="text-xs text-gray-500">
                  {stats.total > 0 ? `(${(stats.no_fracture_count / stats.total * 100).toFixed(1)}%)` : '0%'}
                </div>
              </div>
              <div className="p-3 bg-white rounded shadow-sm">
                <div className="text-sm text-gray-600">Located Fractures</div>
                <div className="text-xl font-bold">{stats.located_count || 0}</div>
                <div className="text-xs text-gray-500">
                  {stats.fracture_count > 0 ? `(${((stats.located_count || 0) / stats.fracture_count * 100).toFixed(1)}%)` : '0%'}
                </div>
              </div>
              <div className="p-3 bg-white rounded shadow-sm">
                <div className="text-sm text-gray-600">Total Processed</div>
                <div className="text-xl font-bold">{stats.total}</div>
              </div>
              <div className="p-3 bg-white rounded shadow-sm">
                <div className="text-sm text-gray-600">Processing Time</div>
                <div className="text-xl font-bold">{stats.processing_time.toFixed(2)}s</div>
                <div className="text-xs text-gray-500">
                  {stats.total > 0 ? `(${(stats.processing_time / stats.total * 1000).toFixed(1)}ms per image)` : '0ms'}
                </div>
              </div>
              <div className="p-3 bg-white rounded shadow-sm">
                <div className="text-sm text-gray-600">Threshold</div>
                <div className="text-xl font-bold">{stats.threshold}</div>
              </div>
              
              {/* Model info if available */}
              {stats.model && stats.model.model_accuracy && (
                <div className="p-3 bg-white rounded shadow-sm col-span-3">
                  <div className="text-sm text-gray-600">Model Info</div>
                  <div className="text-sm">
                    <span className="font-medium">Accuracy:</span> {stats.model.model_accuracy}% | 
                    <span className="font-medium ml-2">F1 Score:</span> {stats.model.model_f1 || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Using model #{stats.model.model_id} from {stats.model.model_timestamp}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="mb-3 p-3 bg-white rounded shadow-sm">
            <h3 className="font-medium mb-2">Download Results</h3>
            <p className="text-sm text-gray-600 mb-3">
              The ZIP file contains three folders:
            </p>
            <ul className="text-sm text-gray-600 list-disc pl-5 mb-3">
              <li><span className="font-medium">fracture</span> - All detected fracture images</li>
              <li><span className="font-medium">no_fracture</span> - All images with no fractures</li>
              <li><span className="font-medium">location</span> - Fracture images with highlighted fracture locations</li>
            </ul>
          </div>
          
          <a 
            href={downloadUrl} 
            download="sorted_xrays.zip"
            className="block w-full text-center bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700"
          >
            Download Sorted Images (ZIP)
          </a>
        </div>
      )}
    </div>
  );
}