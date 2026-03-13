# 🩺 CareTrack - Advanced EMR & Clinical Management System

**CareTrack** is a professional Full-Stack Electronic Medical Record (EMR) platform designed to digitize clinical workflows. The project demonstrates the integration of complex features such as **Multi-Cloud Architecture (AWS & Azure)**, **Automated Scheduling**, and **Digital Document Signing**.

## 🚀 Key Technical Features

### 🔐 Security & Access Control
* **JWT Authentication & RBAC:** Implements a secure authentication system using JSON Web Tokens, differentiating permissions between `Doctor` and `Admin` roles.
* **Audit Logging:** A sophisticated security feature that monitors critical actions, logging the timestamp, action type, user, and IP address for compliance and security.
* **Digital Signature Engine:** Integrated professional signing capability using `react-signature-canvas`, allowing practitioners and patients to sign consent forms directly in the browser.

### ☁️ Cloud & AI Integration
* **Hybrid Cloud Storage:** Leverages **AWS S3** for scalable medical file storage, ensuring that high-resolution scans and lab results are stored efficiently.
* **AI-Powered OCR:** Integrated **Azure AI Vision** to automatically extract text from uploaded images (lab results, prescriptions), transforming static scans into searchable data.

### 📅 Advanced Business Logic
* **Smart Scheduler:** An availability-aware scheduling system that prevents double-booking and manages "unavailable slots" in real-time.
* **Automated Patient Reminders:** A background service powered by **Node-Cron** that automatically sends email notifications (via **Nodemailer**) to patients for upcoming appointments.
* **Dynamic Template Engine:** A system for creating standardized medical agreements with dynamic variables (e.g., `{{PATIENT_NAME}}`) that auto-populate during the form issuance process.

### 📄 Data Management & Reporting
* **Automated PDF Generation:** Uses **jsPDF** to generate professional medical reports and signed agreements, injecting digital signatures directly into the documents.
* **Clinic-Wide Exports:** Provides bulk data export functionality in CSV format for administrative backup and data analysis.

## 🛠️ Tech Stack
* **Frontend:** React.js (Context API, React Router)
* **Backend:** Node.js, Express.js
* **Database:** SQL managed via Sequelize ORM
* **Utilities:** Nodemailer (Emailing), Node-Cron (Scheduled Tasks), Multer (File Processing)
* **Cloud Services:** Amazon Web Services (S3), Microsoft Azure (Cognitive Services OCR)
