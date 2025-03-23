import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function TrainModel() {
  const [isTraining, setIsTraining] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [trainingSummary, setTrainingSummary] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [epochs, setEpochs] = useState(10);
  const [batchSize, setBatchSize] = useState(32);
  const [chartData, setChartData] = useState({
    accuracy: null,
    loss: null,
    metrics: null
  });

  const handleFileChange = (event) => {
    setSelectedDataset(event.target.files);
  };

  const uploadFiles = async (files, baseFolder) => {
    const totalFiles = files.length;
    let uploadedCount = 0;
    
    // Extract top-level folder name from the first file
    const topLevelFolder = files[0].webkitRelativePath.split('/')[0];
    
    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      // Remove the top-level folder name from the path
      const pathWithoutTopFolder = file.webkitRelativePath
        .split('/')
        .slice(1)
        .join('/');
      
      // Construct new path with baseFolder
      const filePath = pathWithoutTopFolder ? 
        `${baseFolder}/${pathWithoutTopFolder}` : 
        `${baseFolder}/${file.name}`;
  
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', filePath);
  
      try {
        const response = await fetch('http://127.0.0.1:5000/upload_chunk', {
          method: 'POST',
          body: formData,
        });
  
        if (!response.ok) {
          throw new Error(`Failed to upload file: ${filePath}`);
        }
  
        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
      } catch (error) {
        console.error("Upload error:", error);
        setErrorMessage(`Upload failed: ${error.message}`);
        return false;
      }
    }
    return true;
  };

  // Prepare chart data from model information
  const prepareChartData = (model) => {
    if (!model) return;

    // Generate labels for the x-axis (epochs)
    const labels = Array.from({ length: model.epochs }, (_, i) => `Epoch ${i+1}`);
    
    // Accuracy chart data
    const accuracyData = {
      labels,
      datasets: [
        {
          label: 'Training Accuracy',
          data: model.accuracy_history,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
        }
      ]
    };
    
    // If validation accuracy is available, add it to the chart
    if (model.val_accuracy_history && model.val_accuracy_history.length > 0) {
      accuracyData.datasets.push({
        label: 'Validation Accuracy',
        data: model.val_accuracy_history,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      });
    }
    
    // Loss chart data
    const lossData = {
      labels,
      datasets: [
        {
          label: 'Training Loss',
          data: model.loss_history,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        }
      ]
    };
    
    // If validation loss is available, add it to the chart
    if (model.val_loss_history && model.val_loss_history.length > 0) {
      lossData.datasets.push({
        label: 'Validation Loss',
        data: model.val_loss_history,
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
      });
    }
    
    // Metrics chart data (precision, recall, f1)
    const metricsData = {
      labels,
      datasets: []
    };
    
    if (model.precision_history && model.precision_history.length > 0) {
      metricsData.datasets.push({
        label: 'Precision',
        data: model.precision_history,
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
      });
    }
    
    if (model.recall_history && model.recall_history.length > 0) {
      metricsData.datasets.push({
        label: 'Recall',
        data: model.recall_history,
        borderColor: 'rgb(255, 205, 86)',
        backgroundColor: 'rgba(255, 205, 86, 0.5)',
      });
    }
    
    if (model.f1_history && model.f1_history.length > 0) {
      metricsData.datasets.push({
        label: 'F1 Score',
        data: model.f1_history,
        borderColor: 'rgb(201, 203, 207)',
        backgroundColor: 'rgba(201, 203, 207, 0.5)',
      });
    }
    
    setChartData({
      accuracy: accuracyData,
      loss: lossData,
      metrics: metricsData.datasets.length > 0 ? metricsData : null
    });
  };

  const startTraining = async () => {
    if (!selectedDataset || selectedDataset.length === 0) {
      setErrorMessage("Please select a dataset first");
      return;
    }

    setIsTraining(true);
    setErrorMessage("");
    setUploadProgress(0);
    setTrainingProgress(0);
    setTrainingSummary(null);
    setChartData({
      accuracy: null,
      loss: null,
      metrics: null
    });

    try {
      // Create a unique folder name for this training session
      const timestamp = new Date().getTime();
      const datasetFolderName = `dataset_${timestamp}`;
      
      // Upload all files in the dataset
      const uploadSuccess = await uploadFiles(selectedDataset, datasetFolderName);
      
      if (!uploadSuccess) {
        throw new Error("File upload failed");
      }

      // Start the training process
      const trainingFormData = new FormData();
      trainingFormData.append('dataset_path', datasetFolderName);
      trainingFormData.append('epochs', epochs);
      trainingFormData.append('batch_size', batchSize);

      const trainingResponse = await fetch('http://127.0.0.1:5000/api/train', {
        method: 'POST',
        body: trainingFormData,
      });

      if (!trainingResponse.ok) {
        const errorData = await trainingResponse.json();
        throw new Error(errorData.error || "Training failed");
      }

      // Start polling for progress updates
      const progressCheckInterval = setInterval(async () => {
        try {
          const response = await fetch('http://127.0.0.1:5000/api/training_progress');
          if (response.ok) {
            const data = await response.json();
            setTrainingProgress(data.progress);
            
            // If training is complete, clear the interval and get results
            if (data.status === 'completed') {
              clearInterval(progressCheckInterval);
              
              // Fetch the latest model (which should be the one we just trained)
              const modelsResponse = await fetch('http://127.0.0.1:5000/api/models');
              if (modelsResponse.ok) {
                const models = await modelsResponse.json();
                if (models.length > 0) {
                  setTrainingSummary(models[0]);
                  prepareChartData(models[0]);
                  setIsTraining(false);
                }
              }
            } else if (data.status === 'failed') {
              clearInterval(progressCheckInterval);
              setErrorMessage(`Training failed: ${data.error}`);
              setIsTraining(false);
            }
          }
        } catch (error) {
          console.error("Error checking progress:", error);
        }
      }, 2000);

    } catch (error) {
      console.error("Training error:", error);
      setErrorMessage(`Training failed: ${error.message}`);
      setIsTraining(false);
    }
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Training Metrics',
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="train-model-container">
      <h2>Train Fracture Detection Model</h2>
      
      <div className="form-section">
        <div className="input-group">
          <label htmlFor="dataset">Select Dataset Folder:</label>
          <input 
            type="file" 
            id="dataset" 
            onChange={handleFileChange} 
            webkitdirectory="true" 
            directory="true" 
            multiple 
            disabled={isTraining}
          />
          <p className="help-text">
            Select a folder containing your dataset organized as:
            <br />
            datasetname/training/fractured/...
            <br />
            datasetname/training/non_fractured/...
            <br />
            datasetname/testing/fractured/...
            <br />
            datasetname/testing/non_fractured/...
          </p>
        </div>

        <div className="input-group">
          <label htmlFor="epochs">Number of Epochs:</label>
          <input 
            type="number" 
            id="epochs" 
            value={epochs} 
            onChange={(e) => setEpochs(parseInt(e.target.value))} 
            min="1" 
            max="100" 
            disabled={isTraining}
          />
        </div>

        <div className="input-group">
          <label htmlFor="batchSize">Batch Size:</label>
          <input 
            type="number" 
            id="batchSize" 
            value={batchSize} 
            onChange={(e) => setBatchSize(parseInt(e.target.value))} 
            min="1" 
            max="128" 
            disabled={isTraining}
          />
        </div>

        <button 
          className="train-button" 
          onClick={startTraining} 
          disabled={isTraining || !selectedDataset}
        >
          {isTraining ? "Training in Progress..." : "Start Training"}
        </button>
      </div>

      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      {isTraining && (
        <div className="progress-section">
          <div className="progress-group">
            <label>Upload Progress:</label>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <span>{uploadProgress}%</span>
          </div>

          <div className="progress-group">
            <label>Training Progress:</label>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${trainingProgress}%` }}></div>
            </div>
            <span>{trainingProgress}%</span>
          </div>
        </div>
      )}

      {trainingSummary && (
        <div className="training-summary">
          <h3>Training Results</h3>
          <table>
            <tbody>
              <tr>
                <td>Training Time:</td>
                <td>{trainingSummary.training_time} seconds</td>
              </tr>
              <tr>
                <td>Accuracy:</td>
                <td>{(trainingSummary.accuracy * 100).toFixed(2)}%</td>
              </tr>
              <tr>
                <td>Loss:</td>
                <td>{trainingSummary.loss.toFixed(4)}</td>
              </tr>
              <tr>
                <td>Precision:</td>
                <td>{(trainingSummary.precision * 100).toFixed(2)}%</td>
              </tr>
              <tr>
                <td>Recall:</td>
                <td>{(trainingSummary.recall * 100).toFixed(2)}%</td>
              </tr>
              <tr>
                <td>F1 Score:</td>
                <td>{(trainingSummary.f1_score * 100).toFixed(2)}%</td>
              </tr>
              <tr>
                <td>Model ID:</td>
                <td>{trainingSummary.id}</td>
              </tr>
            </tbody>
          </table>
          
          <div className="performance-charts">
          <h3 className='per'>Performance Metrics</h3>
            
            <div className="chart-container">
              <h4>Accuracy</h4>
              {chartData.accuracy && (
                <Line 
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        ...chartOptions.plugins.title,
                        text: 'Accuracy per Epoch'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 1,
                        title: {
                          display: true,
                          text: 'Accuracy'
                        }
                      }
                    }
                  }} 
                  data={chartData.accuracy} 
                />
              )}
            </div>
            
            <div className="chart-container">
              <h4>Loss</h4>
              {chartData.loss && (
                <Line 
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        ...chartOptions.plugins.title,
                        text: 'Loss per Epoch'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Loss'
                        }
                      }
                    }
                  }} 
                  data={chartData.loss} 
                />
              )}
            </div>
            
            {chartData.metrics && (
              <div className="chart-container">
                <h4>Other Metrics</h4>
                <Line 
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        ...chartOptions.plugins.title,
                        text: 'Precision, Recall, F1 Score'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 1,
                        title: {
                          display: true,
                          text: 'Value'
                        }
                      }
                    }
                  }} 
                  data={chartData.metrics} 
                />
              </div>
            )}
          </div>
        </div>
      )}
      <style jsx>{`
        .train-model-container {
          padding: 1.5rem;
          background-color: #f8f9fa;
          border-radius: 8px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        h2 {
          margin-bottom: 1.5rem;
          color: #343a40;
        }
        
        .form-section {
          margin-bottom: 2rem;
        }
        
        .input-group {
          margin-bottom: 1rem;
        }
        
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        
        input[type="number"],
        input[type="file"] {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ced4da;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }
        
        .help-text {
          font-size: 0.85rem;
          color: #6c757d;
          margin-top: 0.25rem;
        }
        
        .train-button {
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .train-button:hover:not(:disabled) {
          background-color: #0069d9;
        }
        
        .train-button:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
        
        .error-message {
          color: #dc3545;
          padding: 0.75rem;
          margin-bottom: 1rem;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
        }
        
        .progress-section {
          margin-bottom: 2rem;
        }
        
        .progress-group {
          margin-bottom: 1rem;
        }
        
        .progress-bar {
          height: 1.5rem;
          background-color: #e9ecef;
          border-radius: 4px;
          margin: 0.5rem 0;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background-color: #007bff;
          transition: width 0.3s ease;
        }
        
        .training-summary {
          background-color: #fff;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 1.5rem;
        }
        
        .training-summary h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          color: #343a40;
        }
        
        .training-summary table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .training-summary td {
          padding: 0.5rem;
          border-bottom: 1px solid #dee2e6;
        }
        
        .training-summary td:first-child {
          font-weight: 600;
          width: 40%;
        }

        .training-summary {
          margin-top: 30px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .performance-charts {
          margin-top: 30px;
        }
        .per{
          display: block;
        }
        .chart-container {
          margin-bottom: 30px;
          padding: 15px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .chart-container h4 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #333;
          font-size: 18px;
        }

    

        /* Progress bars styling */
        .progress-section {
          margin: 20px 0;
        }

        .progress-group {
          margin-bottom: 15px;
        }

        .progress-bar {
          height: 20px;
          background-color: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin: 8px 0;
        }

        .progress-fill {
          height: 100%;
          background-color: #007bff;
          transition: width 0.3s ease;
        }

        /* Table styling */
        .training-summary table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }

        .training-summary table td {
          padding: 8px;
          border-bottom: 1px solid #e9ecef;
        }

        .training-summary table td:first-child {
          font-weight: bold;
          width: 40%;
        }
      `}</style>
    </div>
  );
}