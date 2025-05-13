# 📝 Real-Time Collaborative Rich Text Editor

A full-stack collaborative text editor built with **React**, **Quill**, **Socket.IO**, and **Node.js**. This app allows multiple users to edit a document simultaneously in real time, with typing indicators and user presence tracking.

## 🚀 Features

- Real-time text synchronization across users
- Rich text formatting with **Quill**
- Unique username login
- Live user presence
- Typing indicators
- In-memory document state (no database)

## 🛠️ Tech Stack

**Frontend:**
- React + TypeScript
- Quill.js
- Socket.IO client
- TailwindCSS

**Backend:**
- Node.js
- Express
- Socket.IO server
- Quill Delta for document diffs

---

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/GauravDalakoti/RealTimeTextEditor.git
cd realtime-editor

cd server
npm install

configure .env
PORT=3000
FRONTEND_URI=http://localhost:5173

npm run dev

cd ../frontend
npm install

configure .env
VITE_SERVER_URL=http://localhost:3000

npm run dev




