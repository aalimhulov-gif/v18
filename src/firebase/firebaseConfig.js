
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase конфигурация из переменных окружения
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log('🔧 Initializing Firebase...')
console.log('Config check:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  projectId: firebaseConfig.projectId
})

// Проверяем что все необходимые поля заполнены
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration is incomplete. Please check your firebaseConfig.')
  throw new Error('Firebase configuration is incomplete')
}

let app, auth, db

try {
  console.log('🚀 Creating Firebase app...')
  app = initializeApp(firebaseConfig)
  
  console.log('🔐 Initializing Auth...')
  auth = getAuth(app)
  
  console.log('🗄️ Initializing Firestore...')
  db = getFirestore(app)
  
  console.log('✅ Firebase initialized successfully')
} catch (error) {
  console.error('❌ Firebase initialization error:', error)
  
  // Проверяем тип ошибки
  if (error.code === 'auth/network-request-failed') {
    console.error('🚫 Network error - check your internet connection')
  } else if (error.code === 'auth/app-not-authorized') {
    console.error('🚫 App not authorized - check Firebase config')
  }
  
  throw new Error(`Failed to initialize Firebase: ${error.message}`)
}

export { app, auth, db }
