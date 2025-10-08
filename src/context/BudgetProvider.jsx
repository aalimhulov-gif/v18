import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { db } from '../firebase/firebaseConfig'
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy,
  query, serverTimestamp, setDoc, updateDoc, where
} from 'firebase/firestore'
import { useAuth } from '../firebase/auth.jsx'

const BudgetCtx = createContext(null)

export function BudgetProvider({ children }) {
  const { user } = useAuth()

  const [budgetId, setBudgetId] = useState(localStorage.getItem('budgetId') || null)
  const [budgetCode, setBudgetCode] = useState(localStorage.getItem('budgetCode') || '')
  const [profiles, setProfiles] = useState([])
  const [categories, setCategories] = useState([])
  const [goals, setGoals] = useState([])
  const [operations, setOperations] = useState([])
  const [currency, setCurrency] = useState(localStorage.getItem('currency') || 'PLN')
  const [rates, setRates] = useState({ PLN: 1, USD: 0.25, UAH: 9.2 })
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  // Theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  // Currency
  useEffect(() => {
    localStorage.setItem('currency', currency)
  }, [currency])

  // Загрузка данных
  useEffect(() => {
    if (!user || !budgetId) {
      console.log('No user or budgetId, skipping data load')
      return
    }

    console.log('Loading budget data...', { budgetId, userId: user.uid })

    let unsubscriptions = []

    // Проверяем доступ к бюджету
    const checkAccess = async () => {
      try {
        const budgetSnap = await getDoc(doc(db, 'budgets', budgetId))
        if (!budgetSnap.exists()) {
          console.error('Budget not found')
          setBudgetId(null)
          localStorage.removeItem('budgetId')
          return
        }

        const budgetData = budgetSnap.data()
        if (!budgetData.members || !budgetData.members[user.uid]) {
          console.error('No access to budget')
          setBudgetId(null)
          localStorage.removeItem('budgetId')
          return
        }

        // Подписываемся на профили
        const unsubProfiles = onSnapshot(
          query(collection(db, 'budgets', budgetId, 'profiles')),
          (snapshot) => {
            const newProfiles = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            console.log('Profiles loaded:', newProfiles.length)
            setProfiles(newProfiles)
          },
          (error) => console.error('Error loading profiles:', error)
        )

        // Подписываемся на категории
        const unsubCategories = onSnapshot(
          query(collection(db, 'budgets', budgetId, 'categories')),
          (snapshot) => {
            const newCategories = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            console.log('Categories loaded:', newCategories.length)
            setCategories(newCategories)
          },
          (error) => console.error('Error loading categories:', error)
        )

        // Подписываемся на операции
        const unsubOperations = onSnapshot(
          query(collection(db, 'budgets', budgetId, 'operations'), orderBy('date', 'desc')),
          (snapshot) => {
            const newOperations = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            console.log('Operations loaded:', newOperations.length)
            setOperations(newOperations)
          },
          (error) => console.error('Error loading operations:', error)
        )

        // Сохраняем функции отписки
        unsubscriptions = [unsubProfiles, unsubCategories, unsubOperations]

      } catch (error) {
        console.error('Error checking budget access:', error)
      }
    }

    checkAccess()
    
    // Возвращаем функцию очистки
    return () => {
      console.log('🧹 Cleaning up Firestore subscriptions...')
      unsubscriptions.forEach(unsub => {
        if (unsub && typeof unsub === 'function') {
          unsub()
        }
      })
    }
  }, [user, budgetId])

  // Budget
  function genCode(len = 6) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let s = ''
    for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
    return s
  }

  async function createBudget() {
    if (!user) {
      console.error('No user found')
      throw new Error('Необходима авторизация')
    }

    try {
      // Очищаем предыдущее состояние
      setBudgetId(null)
      setBudgetCode('')
      localStorage.removeItem('budgetId')
      localStorage.removeItem('budgetCode')

      const code = genCode(6)
      const budgetRef = doc(collection(db, 'budgets'))

      console.log('Creating budget...', { userId: user.uid, budgetId: budgetRef.id })

      // Создаем бюджет
      await setDoc(budgetRef, {
        owner: user.uid,
        createdAt: serverTimestamp(),
        currency: 'PLN',
        code,
        members: {
          [user.uid]: true
        }
      })

      // Проверяем создание бюджета
      const budgetCheck = await getDoc(budgetRef)
      if (!budgetCheck.exists()) {
        console.error('Budget creation failed')
        throw new Error('Не удалось создать бюджет')
      }

      // Создаем профиль для текущего пользователя
      await addDoc(collection(budgetRef, 'profiles'), {
        name: user.email.split('@')[0],
        userId: user.uid,
        createdAt: serverTimestamp(),
        online: true,
        lastSeen: serverTimestamp(),
        lastLogin: serverTimestamp()
      })

      console.log('Profile created, creating categories...')

      // Создаем базовые категории
      const defaultCategories = [
        { name: 'Зарплата', emoji: '💰', type: 'income', limit: 0 },
        { name: 'Фриланс', emoji: '💻', type: 'income', limit: 0 },
        { name: 'Подарки', emoji: '🎁', type: 'income', limit: 0 },
        { name: 'Еда', emoji: '🍕', type: 'expense', limit: 0 },
        { name: 'Транспорт', emoji: '🚗', type: 'expense', limit: 0 },
        { name: 'Развлечения', emoji: '🎮', type: 'expense', limit: 0 },
        { name: 'Покупки', emoji: '🛒', type: 'expense', limit: 0 },
        { name: 'Здоровье', emoji: '🏥', type: 'expense', limit: 0 },
        { name: 'Прочее', emoji: '📝', type: 'both', limit: 0 }
      ]

      for (const category of defaultCategories) {
        await addDoc(collection(budgetRef, 'categories'), {
          ...category,
          createdAt: serverTimestamp()
        })
      }

      // Сохраняем ID бюджета
      setBudgetId(budgetRef.id)
      setBudgetCode(code)
      localStorage.setItem('budgetId', budgetRef.id)
      localStorage.setItem('budgetCode', code)

      console.log('Budget creation completed successfully')
      return budgetRef.id
    } catch (error) {
      console.error('Error creating budget:', error)
      
      // Более детальная обработка ошибок
      if (error.code === 'permission-denied') {
        throw new Error('Нет прав для создания бюджета. Проверьте правила безопасности Firebase.')
      } else if (error.code === 'network-request-failed') {
        throw new Error('Ошибка сети. Проверьте подключение к интернету.')
      } else if (error.message?.includes('Firebase configuration')) {
        throw new Error('Ошибка конфигурации Firebase. Проверьте настройки.')
      }
      
      throw new Error(`Не удалось создать бюджет: ${error.message}`)
    }
  }

  async function joinBudget(idOrCode) {
    if (!user) {
      throw new Error('Необходима авторизация')
    }

    try {
      const raw = (idOrCode || '').trim()
      if (!raw) throw new Error('Пустой ID/код бюджета')

      // Пробуем найти по ID
      const tryId = await getDoc(doc(db, 'budgets', raw))
      if (tryId.exists()) {
        const budgetData = tryId.data()
        
        // Добавляем пользователя в members
        await updateDoc(doc(db, 'budgets', tryId.id), {
          [`members.${user.uid}`]: true
        })

        // Создаем профиль пользователя
        await addDoc(collection(db, 'budgets', tryId.id, 'profiles'), {
          name: user.email.split('@')[0],
          userId: user.uid,
          createdAt: serverTimestamp(),
          online: true,
          lastSeen: serverTimestamp(),
          lastLogin: serverTimestamp()
        })

        setBudgetId(tryId.id)
        setBudgetCode(budgetData?.code || '')
        localStorage.setItem('budgetId', tryId.id)
        if (budgetData?.code) localStorage.setItem('budgetCode', budgetData.code)
        return tryId.id
      }

      // Пробуем найти по коду
      const q = query(collection(db, 'budgets'), where('code', '==', raw.toUpperCase()))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const doc = snap.docs[0]
        const budgetData = doc.data()

        // Добавляем пользователя в members
        await updateDoc(doc.ref, {
          [`members.${user.uid}`]: true
        })

        // Создаем профиль пользователя
        await addDoc(collection(doc.ref, 'profiles'), {
          name: user.email.split('@')[0],
          userId: user.uid,
          createdAt: serverTimestamp(),
          online: true,
          lastSeen: serverTimestamp(),
          lastLogin: serverTimestamp()
        })

        setBudgetId(doc.id)
        setBudgetCode(budgetData?.code || '')
        localStorage.setItem('budgetId', doc.id)
        if (budgetData?.code) localStorage.setItem('budgetCode', budgetData.code)
        return doc.id
      }

      throw new Error('Бюджет не найден')
    } catch (error) {
      console.error('Error joining budget:', error)
      throw error
    }
  }

  // Helpers
  function convert(amountPLN) {
    const rate = rates[currency] || 1
    return Number(amountPLN) * rate
  }

  return (
    <BudgetCtx.Provider value={{
      budgetId,
      budgetCode,
      profiles,
      categories,
      goals,
      operations,
      currency,
      theme,
      rates,
      createBudget,
      joinBudget,
      convert,
      setCurrency,
      toggleTheme
    }}>
      {children}
    </BudgetCtx.Provider>
  )
}

export function useBudget() {
  return useContext(BudgetCtx)
}