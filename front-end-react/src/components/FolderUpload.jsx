import React, { useState, useRef, useEffect } from 'react';

export default function FolderUpload({ onFolderSelect, isDisabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [fileCount, setFileCount] = useState(0);
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);

  useEffect(() => {
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add event listeners 
    const dropArea = dropAreaRef.current;
    if (dropArea) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
      });
    }

    return () => {
      // Clean up event listeners
      if (dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
          dropArea.removeEventListener(eventName, preventDefaults, false);
        });
      }
    };
  }, []);

  const handleDragOver = () => {
    if (!isDisabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    if (isDisabled) return;
    
    setIsDragging(false);
    
    // Access the DataTransferItemList
    const items = e.dataTransfer.items;
    if (items) {
      // Look for folder
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item && item.isDirectory) {
          traverseFileTree(item);
          return;
        }
      }
      // No folder found, show error
      alert("Please drop a folder, not individual files");
    }
  };

  const handleFileChange = (e) => {
    if (isDisabled) return;
    
    const files = e.target.files;
    if (files && files.length > 0) {
      // Get folder name from the first files path
      const folderPath = files[0].webkitRelativePath;
      const folder = folderPath.split('/')[0];
      
      setFolderName(folder);
      setFileCount(files.length);
      
      // Pass the files up to the parent component
      onFolderSelect(files);
    }
  };

  // Function to recursively scan a dropped folder
  const traverseFileTree = (item, path = "") => {
    if (item.isFile) {
      // This is a file, add it to the virtual input
      item.file(file => {
        console.log("File:", file);
       
      });
    } else if (item.isDirectory) {
      // If this is the first directory, set the folder name
      if (path === "") {
        setFolderName(item.name);
        
    
        alert(`Please select the "${item.name}" folder using the file dialog`);
        fileInputRef.current.click();
      }
      
      // Process directory contents
      const dirReader = item.createReader();
      dirReader.readEntries(entries => {
        for (let i = 0; i < entries.length; i++) {
          traverseFileTree(entries[i], path + item.name + "/");
        }
      });
    }
  };

  const handleBrowseClick = () => {
    if (!isDisabled) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="folder-upload-container">
      <div 
        ref={dropAreaRef}
        className={`folder-upload-area ${isDragging ? 'dragging' : ''} ${isDisabled ? 'disabled' : ''}`}
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        {folderName ? (
          <div className="folder-selected">
            <div className="folder-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div className="folder-info">
              <p className="folder-name">{folderName}</p>
              <p className="file-count">{fileCount} files selected</p>
            </div>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="folder-icon">
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                <path d="M12 11v6"></path>
                <path d="M9 14h6"></path>
              </svg>
            </div>
            <p className="upload-text">Drag & drop a folder here</p>
            <p className="upload-subtext">or click to browse folders</p>
          </div>
        )}
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          webkitdirectory="true"
          directory="true"
          multiple
          className="file-input-hidden"
          style={{ display: 'none' }}
          disabled={isDisabled}
        />
      </div>
    </div>
  );
}