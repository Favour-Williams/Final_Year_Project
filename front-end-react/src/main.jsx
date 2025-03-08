import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';


import LandingPage from './LandingPage.jsx'
import LogInPage from './pages/LoginPage.jsx'
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CreateUser from './pages/CreateUserPage.jsx'
import AdminDashBoard from './pages/AdminDashBoard.jsx'
import DoctorDashboard from './pages/DoctorDashBoard.jsx'
import ViewDoctor from './pages/ViewDoctors.jsx'
import TrainModel from './pages/subPages/TrainModel.jsx'
import PredictImage from './pages/subPages/PredictXray.jsx'
import SortFile from './pages/subPages/SortFile.jsx'
import ExtractCorrectImages from './pages/subPages/ExtractCorrectImages.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>

        <Route path='/' element={<LandingPage/>} />
        <Route path='/login' element={<LogInPage/>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        
        <Route path='/admin' element={<AdminDashBoard/>} />
        <Route path='/admin/createUser' element={<CreateUser/>} />
        <Route path='/admin/view' element={<ViewDoctor/>} />
        <Route path='/admin/train' element={<TrainModel/>} />
        <Route path='/admin/extract' element={<ExtractCorrectImages/>} />


        <Route path='/doctorDashboard' element={<DoctorDashboard/>} /> 
        <Route path='/doctorDashboard/predict' element={<PredictImage/>} />
        <Route path='/doctorDashboard/sort' element={<SortFile/>} />

        
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
