import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';


import LandingPage from './LandingPage.jsx'
import LogInPage from './pages/LoginPage.jsx'
import CreateUser from './pages/CreateUserPage.jsx'
import AdminDashBoard from './pages/AdminDashBoard.jsx'
import DoctorDashboard from './pages/DoctorDashBoard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>

        <Route path='/' element={<LandingPage/>} />
        <Route path='/login' element={<LogInPage/>} />
        
        <Route path='/admin' element={<AdminDashBoard/>} />
        <Route path='/createUser' element={<CreateUser/>} />
        <Route path='/doctorDashboard' element={<DoctorDashboard/>} /> 

        
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
