import React, { useState, useEffect } from 'react'
import { useAuth } from '../firebase/auth.jsx'
import { db } from '../firebase/firebaseConfig.js'
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore'

export default function FirebaseTest() {
  const { user } = useAuth()
  const [testData, setTestData] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Тест создания документа
  const testCreate = async () => {
    setLoading(true)
    setMessage('')
    try {
      const docRef = await addDoc(collection(db, 'test'), {
        message: 'Hello Firebase!',
        user: user?.uid,
        timestamp: new Date()
      })
      setMessage(`✅ Документ создан: ${docRef.id}`)
      loadTestData()
    } catch (error) {
      setMessage(`❌ Ошибка создания: ${error.message}`)
      console.error('Create error:', error)
    }
    setLoading(false)
  }

  // Тест чтения документов
  const loadTestData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'test'))
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setTestData(data)
    } catch (error) {
      setMessage(`❌ Ошибка чтения: ${error.message}`)
      console.error('Read error:', error)
    }
  }

  // Тест удаления документа
  const testDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'test', id))
      setMessage(`✅ Документ удален: ${id}`)
      loadTestData()
    } catch (error) {
      setMessage(`❌ Ошибка удаления: ${error.message}`)
      console.error('Delete error:', error)
    }
  }

  useEffect(() => {
    if (user) {
      loadTestData()
    }
  }, [user])

  if (!user) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">🔬 Тест Firebase</h2>
        <p className="text-zinc-400">Войдите в систему для тестирования Firebase</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">🔬 Тест Firebase</h2>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-zinc-400 mb-2">Пользователь: {user.email}</p>
            <p className="text-sm text-zinc-400 mb-4">UID: {user.uid}</p>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={testCreate}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Создаю...' : 'Создать тестовый документ'}
            </button>
            
            <button 
              onClick={loadTestData}
              className="btn-secondary"
            >
              Обновить данные
            </button>
          </div>

          {message && (
            <div className={`p-3 rounded-lg ${
              message.includes('✅') 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">📄 Тестовые документы ({testData.length})</h3>
        
        {testData.length === 0 ? (
          <p className="text-zinc-400">Нет тестовых документов</p>
        ) : (
          <div className="space-y-2">
            {testData.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                <div>
                  <p className="font-medium">{item.message}</p>
                  <p className="text-sm text-zinc-400">
                    ID: {item.id} | User: {item.user}
                  </p>
                </div>
                <button 
                  onClick={() => testDelete(item.id)}
                  className="text-red-400 hover:text-red-300 px-3 py-1 rounded"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}