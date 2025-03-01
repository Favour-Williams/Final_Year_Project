import React from 'react';
import { useNavigate } from 'react-router-dom';


function DoctorPage() {
    const navigate = useNavigate();


    const handlePredictImage = () => {
        navigate('/doctorDashboard/predict');  
    };

    const handleSortFile = () => {
        navigate('/doctorDashboard/sort');  
    };

    return (
        <div>
            <h1>Welcome Doctor </h1>
           <div>
                <button onClick={handlePredictImage}>PredictImage</button>
                <button onClick={handleSortFile}> Sort Folder</button>
                
           </div>
        </div>
    );
}

export default DoctorPage;
