import React, { useState, useRef } from 'react';

export default function SortFile() {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const formRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setError(null);
    setDownloadUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      setError("Please select files to process");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      const formData = new FormData();
      
      // Add all files to the form data
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      // Start uploading files
      const uploadResponse = await fetch('http://localhost:5000/upload-xrays', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload files');
      }

      const uploadResult = await uploadResponse.json();
      setIsUploading(false);
      setIsProcessing(true);
      
      // Start polling for processing progress
      const sessionId = uploadResult.session_id;
      const pollInterval = setInterval(async () => {
        const progressResponse = await fetch(`http://localhost:5000/processing-status/${sessionId}`);
        const progressData = await progressResponse.json();
        
        setProcessingProgress(progressData.progress);
        
        if (progressData.status === 'completed') {
          clearInterval(pollInterval);
          setIsProcessing(false);
          setDownloadUrl(`http://localhost:5000/download-results/${sessionId}`);
          setStats(progressData.stats);
        } else if (progressData.status === 'failed') {
          clearInterval(pollInterval);
          setIsProcessing(false);
          setError(progressData.error || 'Processing failed');
        }
      }, 1000);
      
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
        
        <div className="flex gap-3">
          <button 
            type="submit" 
            disabled={isUploading || isProcessing || selectedFiles.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            Process Files
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
              className="bg-blue-600 h-4 rounded-full" 
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
              className="bg-green-600 h-4 rounded-full" 
              style={{ width: `${processingProgress}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {processingProgress}% complete
          </div>
        </div>
      )}

      {/* Download Section */}
      {downloadUrl && (
        <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
          <h2 className="font-medium text-lg mb-3">Processing Complete!</h2>
          
          {stats && (
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded shadow-sm">
                <div className="text-sm text-gray-600">Fractures Detected</div>
                <div className="text-xl font-bold">{stats.fracture_count}</div>
              </div>
              <div className="p-3 bg-white rounded shadow-sm">
                <div className="text-sm text-gray-600">No Fractures</div>
                <div className="text-xl font-bold">{stats.no_fracture_count}</div>
              </div>
              <div className="p-3 bg-white rounded shadow-sm">
                <div className="text-sm text-gray-600">Total Processed</div>
                <div className="text-xl font-bold">{stats.total}</div>
              </div>
              <div className="p-3 bg-white rounded shadow-sm">
                <div className="text-sm text-gray-600">Processing Time</div>
                <div className="text-xl font-bold">{stats.processing_time.toFixed(2)}s</div>
              </div>
            </div>
          )}
          
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