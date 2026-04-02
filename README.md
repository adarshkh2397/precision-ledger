# Precision Ledger - Local Deployment Guide

This application is built with a React frontend, Express backend, and SQLite database.

## Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

## Steps to Deploy Locally

1. **Clone or Download the Project**
   Extract the project files into a directory of your choice.

2. **Install Dependencies**
   Open your terminal in the project root and run:
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   Create a `.env` file in the root directory and add your Gemini API key (optional, for AI features):
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the Development Server**
   Run the following command to start both the Express backend and Vite frontend:
   ```bash
   npm run dev
   ```

5. **Access the Application**
   Open your browser and navigate to:
   `http://localhost:3000`

## Database
The application uses a local SQLite database file named `precision_ledger.db`. It will be automatically created on the first run.

## Build for Production
To create a production-ready build:
```bash
npm run build
npm start
```
