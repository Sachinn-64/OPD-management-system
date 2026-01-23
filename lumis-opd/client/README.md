# Lumis OPD - Frontend

## 🏥 Raghoji Hospital OPD Management System

A comprehensive, voice-enabled OPD (Outpatient Department) management system built for Raghoji Hospital, Solapur - Kidney & Multispeciality Hospital.

## ✨ Key Features

### 🎤 **Voice-to-Text Support**
- Click microphone icon to start/stop voice recording
- Real-time transcription using Web Speech API
- Works in Clinical Notes, Diagnosis, and Prescription forms
- Supports multiple languages (English, Hindi, Marathi)

### 📊 **Single-Screen Doctor Dashboard**
- Minimal navigation - everything in one view
- Real-time patient queue updates
- Live consultation status tracking
- Instant vitals display

### 🔴 **Real-Time Updates**
- Socket.IO integration for live notifications
- Queue updates without page refresh
- Appointment status changes in real-time
- Connection status indicator

### 💚 **Comprehensive OPD Workflow**
1. **Patient Queue** - Today's appointments with status
2. **Vitals Recording** - All vital signs with BMI calculation
3. **Clinical Notes** - Voice-enabled consultation notes
4. **Diagnosis** - ICD coding with severity levels
5. **Prescription** - Medication management with print

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Server State**: React Query (@tanstack/react-query)
- **HTTP Client**: Axios with interceptors
- **Real-time**: Socket.IO Client
- **Voice Recognition**: Web Speech API
- **Routing**: React Router v6
- **Icons**: Lucide React

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Configuration

Update `src/config/constants.ts` with your backend API URL:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',  // Change to your backend URL
  SOCKET_URL: 'http://localhost:3000',
  // ...
};
```

## 🎯 Usage

### For Doctors:

1. **Login** with your credentials
2. **View Queue** - See all today's patients in left sidebar
3. **Select Patient** - Click on patient card to start consultation
4. **Record Vitals** - Enter vital signs (voice not needed)
5. **Clinical Notes** - Click mic 🎤, speak, click again to stop
6. **Diagnosis** - Add diagnosis with voice notes
7. **Prescription** - Add medications with voice instructions
8. **Complete** - Mark consultation as complete

### Voice Input Tips:

- 🎤 Click microphone icon to start recording
- 🔴 Red pulsing mic = Recording active
- 🛑 Click mic again to stop and save
- 📝 Text appears in real-time
- ✅ Works best in Chrome/Edge browsers

## 🏗️ Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── doctor/           # Doctor-specific components
│   │   │   ├── PatientQueue.tsx
│   │   │   ├── ConsultationPanel.tsx
│   │   │   ├── VitalsForm.tsx
│   │   │   ├── ClinicalNotesForm.tsx
│   │   │   ├── DiagnosisForm.tsx
│   │   │   └── PrescriptionForm.tsx
│   │   └── ui/               # Reusable UI components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Card.tsx
│   │       └── VoiceInput.tsx
│   ├── config/
│   │   └── constants.ts      # App configuration
│   ├── hooks/
│   │   ├── useVoiceRecognition.ts
│   │   └── useSocket.ts
│   ├── lib/
│   │   └── axios.ts          # Axios instance with auth
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   └── doctor/
│   │       └── DoctorDashboard.tsx
│   ├── services/
│   │   ├── authService.ts
│   │   ├── patientService.ts
│   │   ├── appointmentService.ts
│   │   └── consultationService.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   └── consultationStore.ts
│   ├── styles/
│   │   └── index.css
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🎨 Design System

### Colors:
- **Primary**: Emerald Green (#059669)
- **Success**: Green (#16A34A)
- **Warning**: Yellow (#EAB308)
- **Danger**: Red (#DC2626)
- **Info**: Blue (#3B82F6)

### Typography:
- **Headings**: Bold, Large
- **Body**: Regular, Medium
- **Captions**: Small, Light

## 🔐 Authentication

- JWT-based authentication
- Automatic token refresh
- Role-based access control (DOCTOR, RECEPTIONIST)
- Protected routes with redirects

## 🌐 API Integration

All API calls use the centralized `axios` instance with:
- Request interceptor for auth token
- Response interceptor for token refresh
- Error handling and redirects
- TypeScript interfaces for responses

## 📱 Browser Support

- ✅ Chrome 90+ (Recommended for voice)
- ✅ Edge 90+
- ✅ Firefox 88+ (Voice limited)
- ⚠️ Safari 14+ (Voice not supported)

## 🚀 Deployment

```bash
# Build for production
npm run build

# Output will be in dist/ folder
# Deploy to Netlify, Vercel, or any static hosting
```

### Environment Variables

Create `.env` file:

```env
VITE_API_URL=https://your-backend-api.com
VITE_SOCKET_URL=https://your-backend-api.com
```

## 📄 License

Copyright © 2024 Raghoji Hospital. All rights reserved.

## 👨‍💻 Developer

Built with ❤️ for Raghoji Hospital, Solapur

---

**For Support**: Contact IT Department
**Hospital**: Raghoji Hospital - Kidney & Multispeciality Hospital, Solapur
