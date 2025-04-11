import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FolderUpload from '../../components/FolderUpload';
import '../../styles/sortfile.css';

export default function SortFile() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [threshold, setThreshold] = useState(0.3);
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

  const handleFolderSelect = (files) => {
    setSelectedFiles(Array.from(files));
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
    <>
      <header className="dashboard-header">
        <div className="logo">
        <div className="footer-logo-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
          <span className="logo-text">BoneDetect AI</span>
        </div>
      </header>

      <div className="icon-background">
        <div className="bg-icon icon-1">👤</div>
        <div className="bg-icon icon-2">📱</div>
        <div className="bg-icon icon-3">💻</div>
        <div className="bg-icon icon-4">📧</div>
        <div className="bg-icon icon-5">🔑</div>
        <div className="bg-icon icon-6">⚙️</div>
        <div className="bg-icon icon-7">📊</div>
        <div className="bg-icon icon-8">📈</div>
        <div className="bg-icon icon-9">👑</div>
        <div className="bg-icon icon-10">🌟</div>
        <div className="bg-icon icon-11">🚀</div>
        <div className="bg-icon icon-12">💡</div>
        <div className="bg-icon icon-13">🎯</div>
        <div className="bg-icon icon-14">⭐</div>
        <div className="bg-icon icon-15">🔔</div>
        <div className="bg-icon icon-16">📝</div>
        <div className="bg-icon icon-17">🏆</div>
        <div className="bg-icon icon-18">👍</div>
        <div className="bg-icon icon-19">📂</div>
        <div className="bg-icon icon-20">🔍</div>
      </div>

      <div 
        className="back-arrow" 
        onClick={() => navigate(-1)} 
        title="Go back to previous page"
      ></div>
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Sort X-ray Images</h1>
        
        <form ref={formRef} onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4">
            <label className="block mb-2 font-medium">Upload X-ray Images Folder</label>
            
            <FolderUpload 
              onFolderSelect={handleFolderSelect} 
              isDisabled={isUploading || isProcessing} 
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
              disabled={isUploading || isProcessing}
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
          <div className="download-section">
            <div className="section-header">
              <h2>Processing Complete!</h2>
            </div>
            
            {stats && (
              <div className="stats-grid">
                <div className="stat-card fracture">
                  <div className="stat-label">Fractures Detected</div>
                  <div className="stat-value">{stats.fracture_count}</div>
                  <div className="stat-percentage">
                    {stats.total > 0 ? `(${(stats.fracture_count / stats.total * 100).toFixed(1)}%)` : '0%'}
                  </div>
                </div>
                <div className="stat-card no-fracture">
                  <div className="stat-label">No Fractures</div>
                  <div className="stat-value">{stats.no_fracture_count}</div>
                  <div className="stat-percentage">
                    {stats.total > 0 ? `(${(stats.no_fracture_count / stats.total * 100).toFixed(1)}%)` : '0%'}
                  </div>
                </div>
                <div className="stat-card located">
                  <div className="stat-label">Located Fractures</div>
                  <div className="stat-value">{stats.located_count || 0}</div>
                  <div className="stat-percentage">
                    {stats.fracture_count > 0 ? `(${((stats.located_count || 0) / stats.fracture_count * 100).toFixed(1)}%)` : '0%'}
                  </div>
                </div>
                <div className="stat-card total">
                  <div className="stat-label">Total Processed</div>
                  <div className="stat-value">{stats.total}</div>
                </div>
                <div className="stat-card time">
                  <div className="stat-label">Processing Time</div>
                  <div className="stat-value">{stats.processing_time.toFixed(2)}s</div>
                  <div className="stat-percentage">
                    {stats.total > 0 ? `(${(stats.processing_time / stats.total * 1000).toFixed(1)}ms per image)` : '0ms'}
                  </div>
                </div>
                <div className="stat-card threshold">
                  <div className="stat-label">Threshold</div>
                  <div className="stat-value">{stats.threshold}</div>
                </div>
                
                {/* Model info if available */}
                {stats.model && stats.model.model_accuracy && (
                  <div className="stat-card model">
                    <div className="stat-label">Model Info</div>
                    <div className="model-info">
                      <div className="model-info-item">
                        <span className="model-info-label">Accuracy:</span>
                        <span className="model-info-value">{stats.model.model_accuracy}%</span>
                      </div>
                      <div className="model-info-item">
                        <span className="model-info-label">F1 Score:</span>
                        <span className="model-info-value">{stats.model.model_f1 || 'N/A'}</span>
                      </div>
                      <div className="model-info-item text-xs text-gray-500">
                        Using model #{stats.model.model_id} from {stats.model.model_timestamp}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="download-instructions">
              <h3>Download Results</h3>
              <p>The ZIP file contains three folders:</p>
              <ul className="folder-list">
                <li><span className="folder-name">fracture</span> - All detected fracture images</li>
                <li><span className="folder-name">no_fracture</span> - All images with no fractures</li>
                <li><span className="folder-name">location</span> - Fracture images with highlighted fracture locations</li>
              </ul>
            </div>
            
            <a 
              href={downloadUrl} 
              download="sorted_xrays.zip"
              className="download-button"
            >
              <span>Download Sorted Images (ZIP)</span>
            </a>
          </div>
        )}
      </div>
    </>
  );
}