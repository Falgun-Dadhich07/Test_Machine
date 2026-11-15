<div align="center">

  <img src="public/share-logo.jpg" alt="ShARE: Student Chapter Logo" width="100" height="100" style="border-radius: 20px; box-shadow: 0 8px 24px rgba(0, 168, 89, 0.35);" />

  # ShARE: Student Chapter
  ### Winter Project Selection Test Platform

  [![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
  [![Joy UI](https://img.shields.io/badge/MUI-Joy_UI-007FFF?style=for-the-badge&logo=mui)](https://mui.com/joy-ui/)
  [![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
  [![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
  [![License](https://img.shields.io/badge/License-MIT-00a859?style=for-the-badge)](LICENSE)

  <p align="center">
    A high-security, responsive online assessment platform customized for the <b>ShARE: Student Chapter Winter Project Selection Test</b>, featuring automated webcam proctoring, multi-section assessments (MCQ & Numerical), candidate confidentiality, and real-time administrative audit logs.
  </p>

</div>

---

## 📌 Overview

This platform is engineered to conduct large-scale, tamper-resistant selection tests. It replaces traditional exam software with a modern web experience adhering strictly to ShARE branding guidelines, zero public sign-ups, and airtight candidate integrity enforcement.

---

## ✨ Key Features

### 🛡️ Automated AI & Browser Proctoring
- **Enforced Fullscreen Lock**: Candidates must enter fullscreen to commence the examination; exiting or minimizing triggers instant violation flags.
- **Tab & Window Blur Detection**: Real-time detection if a candidate switches tabs, minimizes the browser, or opens developer inspection tools.
- **Webcam Monitoring**: Active webcam video feed with automatic snapshot captures during the session.
- **Auto-Submission Safeguard**: Automatically submits and locks the test if 3 violations are logged or when the exam timer reaches `00:00`.

### 📑 4-Section Examination Structure
- **Sectioned Navigation**: Clean tabbed layout dividing the test into 4 distinct, independently browsable sections.
- **Mixed Question Types**: Supports both standard **Multiple Choice (MCQ)** and typed **Integer / Numerical Input** questions with automated answer validation.
- **Active Progress Tracking**: Highlights answered, unattempted, and flagged questions in an interactive question grid.

### 🔒 Closed-Roster Candidate Authentication
- **Zero Public Sign-ups**: Public account creation is disabled. Only pre-authorized candidates from the registered candidate database can log in.
- **Direct Candidate Credentials**: Validates candidate email and password against the pre-seeded cohort roster.

### 🙈 Confidential Submissions & Instant Auto-Logout
- **Score Concealment**: Raw scores, percentages, and answer keys are strictly concealed from candidates upon submission to prevent collusion and leakage.
- **Immediate Session Teardown**: Upon submission, the candidate is immediately signed out, and redirected back to the login screen with a countdown timer.

### 📊 Comprehensive Admin Dashboard (`/admin`)
- **Live Leaderboard & Submissions**: View real-time submission records with candidate ID, score, submission timestamp, and proctoring status.
- **Security Audit Logs**: Inspect detailed violation logs (tab switch, window blur, fullscreen exits) with millisecond-accurate timestamps.
- **CSV Export**: One-click export of complete examination results for ranking and project allocation.

### 🎨 Dual-Mode ShARE Theme
- **Official Palette**: Handcrafted with ShARE's signature emerald green (`#00a859`).
- **Seamless Mode Switching**:
  - **Light Mode**: Pure crisp white (`#ffffff`) background with charcoal high-contrast typography.
  - **Dark Mode**: Sleek dark greenish-black (`#0b120d`) surface with subtle emerald glow accents.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 14](https://nextjs.org/) (Pages Router) |
| **Frontend UI** | [MUI Joy UI](https://mui.com/joy-ui/) + [Emotion](https://emotion.sh/) |
| **Styling** | Custom ShARE Joy UI Theme + Responsive CSS variables |
| **Database & Auth** | [Google Firebase](https://firebase.google.com/) (Firestore & Firebase Authentication) |
| **Storage & Fallback** | Concurrent-safe serverless JSON storage + Cloud Firestore |
| **Deployment** | [Vercel](https://vercel.com/) (Serverless Edge Hosting) |

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `yarn`

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Falgun-Dadhich07/Test_Machine.git
cd Test_Machine

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory (or copy from `.env.example`):

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Admin Access Control (comma-separated admin emails)
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com,lead@example.com
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment on Vercel (Free Tier)

This platform is optimized for **Vercel's 100% Free Hobby Plan**:

1. **Sign in to Vercel**: Connect your GitHub account at [vercel.com](https://vercel.com).
2. **Import Project**: Select `Falgun-Dadhich07/Test_Machine` and click **Import**.
3. **Configure Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
4. **Add Environment Variables**:
   Under **Environment Variables**, paste the keys from `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
   - `NEXT_PUBLIC_ADMIN_EMAIL`
5. **Deploy**: Click **Deploy**. Your application will be live with full SSL in ~60 seconds.

---

## 🔐 Firebase Firestore Security Rules

To ensure exam results are properly stored in the cloud on serverless environments:

1. Open the [Firebase Console](https://console.firebase.google.com/) -> Select your project.
2. Navigate to **Firestore Database** -> **Rules**.
3. Paste the following configuration and click **Publish**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## 📂 Project Architecture

```
OpenProctor/
├── components/          # Reusable Joy UI components (Header, Proctor, Forms, Layout)
│   ├── CustomWebcam.tsx # Webcam preview & snapshot capture
│   ├── Layout.js        # Global layout with ShARE branding & mode toggle
│   └── result.js        # Admin results viewer & audit table
├── data/
│   ├── active-quiz.json # Current 4-section Winter Selection question paper
│   ├── candidates.json  # Pre-registered candidate authentication database
│   └── questions.js     # Default fallback question sets
├── pages/
│   ├── _app.tsx         # App wrapper, head meta tags, and context providers
│   ├── admin.js         # Administrative dashboard & results analytics
│   ├── dashboard.js     # Pre-test instruction & agreement gateway
│   ├── login.js         # Single-door candidate credential sign-in
│   ├── test/[subject].js# Complete 4-section examination & proctoring engine
│   └── api/
│       ├── auth/candidate-login.js # Closed-roster candidate verification
│       ├── quiz/submit.js          # Scoring engine & submission handler
│       └── admin/results.js        # Admin data aggregation & audit feed
├── public/
│   └── share-logo.jpg   # Official ShARE Student Chapter branding asset
└── styles/
    ├── globals.css      # Custom styling, scrollbars & Swiper pagination
    └── theme.js         # Custom ShARE Joy UI theme (Light/Dark mode)
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

<div align="center">
  <b>ShARE: Student Chapter</b> • Growing Future Leaders
</div>
