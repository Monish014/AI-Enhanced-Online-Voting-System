# 🗳️ AI-Enhanced Online Voting System

<p align="center">
  <img src="screenshots/admin-dashboard.png" alt="AI-Enhanced Online Voting System" width="100%">
</p>

<p align="center">
A secure, AI-powered online voting platform featuring facial recognition authentication, blockchain-inspired vote integrity, real-time fraud detection, and live election analytics.
</p>

<p align="center">

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-18-339933?style=for-the-badge&logo=node.js)
![Express](https://img.shields.io/badge/Express.js-4.18-black?style=for-the-badge&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)
![JWT](https://img.shields.io/badge/JWT-Authentication-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

</p>

---

# 📌 Project Overview

The **AI-Enhanced Online Voting System** is a full-stack web application designed to provide a secure, transparent, and intelligent online election platform. It integrates AI-based facial recognition, blockchain-style vote verification, JWT authentication, fraud detection, and real-time analytics to improve election integrity and voter trust.

---

# 🚀 Tech Stack

## Frontend

- React 18
- Vite
- Tailwind CSS
- React Router v6
- Axios
- face-api.js
- Socket.io Client
- Recharts
- React Hook Form
- Yup
- jsPDF
- i18next

## Backend

- Node.js
- Express.js
- JWT Authentication
- Mongoose ODM
- Socket.io
- bcryptjs
- Multer
- Nodemailer
- Helmet
- Express Rate Limit
- Express Validator
- node-cron

## Database

- MongoDB Atlas

---
# 📸 Project Screenshots

## 🔐 Login Page

![Login Page](screenshots/login.png)

---

## 📝 Registration Page

![Registration Page](screenshots/register.png)

---

## 👤 Voter Dashboard

![Voter Dashboard](screenshots/voter-dashboard.png)

---

## 🤖 Face Verification

![Face Verification](screenshots/face-verification.png)

---

## 🗳️ Voting Booth

![Voting Booth](screenshots/voting-booth.png)

---

## 🛡️ Admin Dashboard

![Admin Dashboard](screenshots/admin-dashboard.png)

---

## 📊 Election Analytics

![Election Analytics](screenshots/analytics.png)

---

## 🚨 Fraud Detection Dashboard

![Fraud Detection Dashboard](screenshots/fraud-dashboard.png)
# ✨ Features

## 👤 Voter

- Secure Registration
- Email OTP Verification
- AI Face Enrollment
- AI Face Verification before Voting
- JWT Authentication
- Vote Casting
- Download Vote Receipt (PDF)
- Verify Vote using Blockchain Hash
- AI Chatbot Support
- Multi-language Support

---

## 🛡️ Administrator

- Dashboard with Live Statistics
- Election Management
- Candidate Management
- Voter Management
- Fraud Detection Dashboard
- Audit Log Viewer
- Election Analytics
- Export Election Results
- Blockchain Validation

---

## 🤖 AI & Security

- AI Face Recognition
- Blockchain-style Vote Ledger
- JWT Authentication
- Refresh Token Authentication
- BCrypt Password Hashing
- SHA-256 Vote Hashing
- AES-256 Vote Encryption
- Fraud Detection Middleware
- Role-Based Access Control
- Rate Limiting
- Helmet Security Headers

---

# 📁 Project Structure

```text
AI-Enhanced-Online-Voting-System/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   └── server.js
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── screenshots/
├── README.md
└── package.json
```

---

# ✅ Prerequisites

- Node.js 18+
- npm
- MongoDB Atlas Account
- Git

---

# ⚙️ Environment Variables

Create a `.env` file inside the backend directory.

```env
PORT=5000

MONGODB_URI=YOUR_MONGODB_URI

JWT_SECRET=YOUR_SECRET_KEY

JWT_REFRESH_SECRET=YOUR_REFRESH_SECRET

EMAIL_USER=YOUR_EMAIL

EMAIL_PASS=YOUR_APP_PASSWORD

CLIENT_URL=http://localhost:5173
```

---

# ▶️ Installation

## Clone Repository

```bash
git clone https://github.com/Monish014/AI-Enhanced-Online-Voting-System.git
```

## Backend

```bash
cd backend

npm install

npm run dev
```

Backend runs on:

```
http://localhost:5000
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

---

# 👥 User Roles

| Role | Permissions |
|------|-------------|
| Voter | Register, Face Verification, Vote, Download Receipt |
| Admin | Manage Elections, Candidates, Voters, Fraud Detection, Analytics |

---

# 🔐 Security Features

- JWT Authentication
- Refresh Token Authentication
- Role-Based Access Control
- AI Face Recognition
- SHA-256 Vote Ledger
- AES-256 Vote Encryption
- BCrypt Password Hashing
- Fraud Detection
- Rate Limiting
- Helmet Security

---

# 📊 Key Modules

- User Registration
- Face Recognition Authentication
- Election Management
- Candidate Management
- Secure Voting
- Blockchain Vote Verification
- Fraud Detection
- Real-time Admin Dashboard
- AI Chatbot
- Audit Logs
- Election Analytics

---



# 🎯 Future Enhancements

- Blockchain Integration
- Aadhaar e-KYC
- Mobile Application
- Deepfake Detection using AI
- Biometric Multi-factor Authentication
- Cloud Deployment
- SMS OTP Integration

---

# 🎓 Academic Project

This project was developed as a **college academic project** to demonstrate modern web application development, AI-based authentication, secure online voting, blockchain-inspired integrity, and real-time analytics using the MERN stack.

---

# 📄 License

This project is licensed under the **MIT License**.
