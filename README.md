# 🏥 CareTrack - Patient & Clinic Management System

**CareTrack** is a modern, full-stack clinic management application designed to streamline patient care, appointment scheduling, and medical documentation. Built with a focus on ease of use and professional workflows, it enables healthcare providers to manage their practice efficiently from a single dashboard.

---

## 🚀 Key Features

### 👨‍⚕️ Dashboard & Management
- **Centralized Dashboard**: Real-time stats on active patients and today's schedule.
- **Patient Management**: Full CRUD operations for patient records, including age, contact info, and medical history.
- **Staff Management**: Role-based access control for clinic staff.

### 📅 Advanced Scheduling
- **Intuitive Calendar**: Visual scheduling with a dedicated `SchedulerModal`.
- **Conflict Prevention**: Automated availability checks to prevent double-booking.
- **Automated Reminders**: Integrated Cron jobs to send daily appointment reminders via email.

### 📝 Medical Documentation
- **Digital Signatures**: Capture and store professional doctor signatures and patient agreement signatures securely via **AWS S3**.
- **Dynamic Form Templates**: Create reusable medical forms and agreements with auto-filling patient data.
- **PDF Export**: Generate professional PDF documents for patient agreements using `jsPDF`.

### 🔍 Smart Tools
- **OCR Text Extraction**: Powered by **Google Cloud Vision** – upload scans of lab results or insurance cards to extract text automatically.
- **File & Photo Storage**: Robust management of patient attachments (lab results, X-rays) hosted on S3.
- **Security Audit Logs**: Track sensitive actions for compliance and security.

---

## 🛠️ Tech Stack

- **Frontend**: React.js, Context API (Auth), Vanilla CSS (Premium Custom Design).
- **Backend**: Node.js, Express.js.
- **Database**: PostgreSQL with Sequelize ORM.
- **Cloud/External Services**:
  - **AWS S3**: Secure storage for signatures and documents.
  - **Google Cloud Vision API**: OCR capabilities.
  - **Nodemailer**: Automated email notifications.
  - **Dotenvx**: Advanced environment variable management.

---

## ⚡ Quick Start

### Prerequisites
- Node.js (v18+)
- PostgreSQL Server
- AWS IAM account (for S3)
- Google Cloud Service Account (for OCR)

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd caretrack
```

### 2. Backend Setup
```bash
cd caretrack-backend
npm install
```
Create a `.env` file in `caretrack-backend/`:
```env
PORT=4000
DATABASE_URL=postgres://user:password@localhost:5432/caretrack
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000

# AWS S3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=your_region
AWS_S3_BUCKET_NAME=your_bucket

# Google Vision
GOOGLE_APPLICATION_CREDENTIALS=path_to_your_key.json

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```
Run the backend:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../client
npm install
```
Create a `.env` file in `client/`:
```env
REACT_APP_API_URL=http://localhost:4000
```
Run the frontend:
```bash
npm start
```

---

## 📜 License
This project is licensed under the ISC License.

---

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements.

---
**Maintained by**: [Your Name/GitHub Profile]
