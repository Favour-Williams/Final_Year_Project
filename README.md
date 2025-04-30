

---

# 🦴 Bone Fracture Detection System  
### **Installation Guide**  
*(React + Vite Frontend | Flask Backend | TensorFlow AI Model)*  

This guide will help you set up the **Bone Fracture Detection System** on your local machine.  

---

## **📋 Prerequisites**  
Ensure you have the following installed:  

| Requirement | Version | Download Link |
|------------|---------|---------------|
| **Python** | 3.8+ | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 16+ | [nodejs.org](https://nodejs.org/) |
| **npm** | 8+ | (Comes with Node.js) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/downloads) |

### **⚙️ System Requirements**  
- **OS:** Windows 10/11, macOS 10.15+, or Linux  
- **RAM:** 8GB minimum (16GB recommended for model training)  
- **Storage:** 5GB+ free space  
- **GPU:** Optional but recommended for training (CUDA-compatible)  

---

## **🚀 Installation Steps**  

### **1️⃣ Clone the Repository (If Public)**  
```bash
git clone https://github.com/Favour-Williams/Final_Year_Project.git
cd Final_Year_Project
```

---

### **2️⃣ Backend Setup (Flask)**  

#### **🛠️ Create & Activate Virtual Environment**  
*(Prevents dependency conflicts)*  

**Windows:**  
```bash
python -m venv venv
.\venv\Scripts\activate
```

**macOS/Linux:**  
```bash
python3 -m venv venv
source venv/bin/activate
```

#### **📦 Install Python Dependencies**  
```bash
cd BackEndFlask
pip install -r requirements.txt
```

#### **🗃️ Database Setup**  
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

---

### **3️⃣ Frontend Setup (React + Vite)**  

#### **📦 Install Node.js Dependencies**  
```bash
cd ../front-end-react
npm install
```

*(Optional: If using **Yarn**)*  
```bash
yarn install
```

---

### **4️⃣ Run the Application**  

#### **🔙 Start the Flask Backend**  
*(From `/BackEndFlask`)*  
```bash
python run.py
```
- **Runs at:** `http://localhost:5000`  

#### **🖥️ Start the React Frontend**  
*(From `/front-end-react`)*  
```bash
npm run dev
```
- **Runs at:** `http://localhost:3000` (or `http://localhost:5173` for Vite)  

---

## **🔍 Troubleshooting**  

### **Common Issues & Fixes**  
❌ **Flask server not starting?**  
- Ensure Python virtual environment is activated.  
- Check if port `5000` is free (`lsof -i :5000` on macOS/Linux).  

❌ **npm install fails?**  
- Try clearing cache:  
  ```bash
  npm cache clean --force
  ```  
- Use `node --version` to ensure Node.js is installed correctly.  

❌ **TensorFlow GPU not detected?**  
- Install CUDA Toolkit & cuDNN if using an NVIDIA GPU.  
- Verify with:  
  ```python
  import tensorflow as tf
  print(tf.config.list_physical_devices('GPU'))
  ```

---

## **🎉 Success!**  
You should now have:  
✅ **Flask Backend** running on `http://localhost:5000`  
✅ **React Frontend** running on `http://localhost:3000` or `http://localhost:5173`  

Open your browser and start detecting bone fractures! 🚑  

