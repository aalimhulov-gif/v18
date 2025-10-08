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

  // Обновление онлайн статуса с оптимизацией запросов
  useEffect(() => {
    if (!user || !budgetId) return

    // Найти профиль текущего пользователя
    const userProfile = profiles.find(p => p.userId === user.uid)
    if (!userProfile) return

    let lastUpdate = 0
    const updateInterval = 60000 // Минимальный интервал между обновлениями - 1 минута

    // Обновить онлайн статус с защитой от частых обновлений
    const updateOnlineStatus = async () => {
      const now = Date.now()
      if (now - lastUpdate < updateInterval) {
        return // Пропускаем обновление если прошло меньше минуты
      }

      try {
        const profileRef = doc(db, 'budgets', budgetId, 'profiles', userProfile.id)
        await updateDoc(profileRef, {
          online: true,
          lastSeen: serverTimestamp(),
          // Обновляем lastLogin только при первом входе
          ...(lastUpdate === 0 ? { lastLogin: serverTimestamp() } : {})
        })
        lastUpdate = now
      } catch (error) {
        console.error('Failed to update online status:', error)
      }
    }

    // Обновить статус при загрузке
    updateOnlineStatus()

    // Установить обработчики для отслеживания состояния подключения
    const onlineHandler = () => {
      console.log('🟢 Пользователь онлайн')
      updateOnlineStatus()
    }

    const offlineHandler = async () => {
      console.log('🔴 Пользователь оффлайн')
      if (userProfile) {
        const profileRef = doc(db, 'budgets', budgetId, 'profiles', userProfile.id)
        try {
          await updateDoc(profileRef, {
            online: false,
            lastSeen: serverTimestamp()
          })
        } catch (error) {
          console.error('Error updating offline status:', error)
        }
      }
    }

    // Добавить слушатели событий
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)

    // Обновлять lastSeen каждую минуту, пока пользователь активен
    // Обновляем статус реже - раз в 5 минут вместо каждой минуты
    const intervalId = setInterval(updateOnlineStatus, 300000)

    // Используем debounce для обработки закрытия вкладки
    let timeoutId
    const beforeUnloadHandler = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(offlineHandler, 5000)
    }
    window.addEventListener('beforeunload', beforeUnloadHandler)

    return () => {
      window.removeEventListener('online', onlineHandler)
      window.removeEventListener('offline', offlineHandler)
      window.removeEventListener('beforeunload', beforeUnloadHandler)
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      // Не обновляем статус при каждом размонтировании компонента
      if (window.closed) {
        offlineHandler()
      }
    }
  }, [user, budgetId, profiles])

  const [currency, setCurrency] = useState(localStorage.getItem('currency') || 'PLN')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [rates, setRates] = useState({ PLN: 1, USD: 0.25, UAH: 10.5 })

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

  // FX Rates - временно отключаем внешний API
  useEffect(() => {
    console.log('💱 Using default exchange rates (external API disabled)')
    // Можно включить позже когда исправим сетевые проблемы
    /*
    async function loadRates() {
      try {
        const res = await fetch('https://api.exchangerate.host/latest?base=PLN&symbols=PLN,USD,UAH')
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        const data = await res.json()
        if (data?.rates) {
          setRates({ 
            PLN: data.rates.PLN || 1, 
            USD: data.rates.USD || 0.25, 
            UAH: data.rates.UAH || 10.5 
          })
        }
      } catch (e) { 
        console.error('Rates fetch error:', e)
        // Оставляем дефолтные курсы если не удалось загрузить
      }
    }
    loadRates()
    */
  }, [])

  // Загрузка данных
  useEffect(() => {
    if (!user || !budgetId) return

    console.log('Loading budget data...')

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

    return () => {
      unsubProfiles()
      unsubCategories()
    }
  }, [user, budgetId])

  // Проверка доступа
  useEffect(() => {
    if (!user || !budgetId) return

    // Проверяем права доступа к бюджету
    const checkBudgetAccess = async () => {
      try {
        const budgetRef = doc(db, 'budgets', budgetId)
        const budgetDoc = await getDoc(budgetRef)
        
        if (!budgetDoc.exists()) {
          console.error('Budget not found')
          localStorage.removeItem('budgetId')
          localStorage.removeItem('budgetCode')
          setBudgetId(null)
          setBudgetCode('')
          return
        }

        // Проверяем профили в бюджете
        const profilesRef = collection(db, 'budgets', budgetId, 'profiles')
        const profilesSnap = await getDocs(profilesRef)
        const hasAccess = profilesSnap.docs.some(doc => doc.data().userId === user.uid)

        if (!hasAccess) {
          console.error('User has no access to this budget')
          localStorage.removeItem('budgetId')
          localStorage.removeItem('budgetCode')
          setBudgetId(null)
          setBudgetCode('')
          return
        }
      } catch (error) {
        console.error('Error checking budget access:', error)
        return
      }
    }

    checkBudgetAccess()
    
    try {
      const unsubProfiles = onSnapshot(
        collection(db, 'budgets', budgetId, 'profiles'), 
        (snap) => {
          setProfiles(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        },
        (error) => console.error('Profiles subscription error:', error)
      )
      
      const unsubCategories = onSnapshot(
        collection(db, 'budgets', budgetId, 'categories'), 
        (snap) => {
          setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        },
        (error) => console.error('Categories subscription error:', error)
      )
      
      const unsubGoals = onSnapshot(
        collection(db, 'budgets', budgetId, 'goals'), 
        (snap) => {
          setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        },
        (error) => console.error('Goals subscription error:', error)
      )
      
      const unsubOps = onSnapshot(
        query(collection(db, 'budgets', budgetId, 'operations'), orderBy('date', 'desc')),
        (snap) => setOperations(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        (error) => console.error('Operations subscription error:', error)
      )
      
      return () => { unsubProfiles(); unsubCategories(); unsubGoals(); unsubOps() }
    } catch (error) {
      console.error('Subscription setup error:', error)
    }
  }, [user, budgetId])

  // Calculations
  const balances = useMemo(() => {
    const byId = {}
    profiles.forEach(p => { byId[p.id] = 0 })
    operations.forEach(op => {
      const amount = Number(op.amount || 0)
      if (op.type === 'income' && op.profileId) byId[op.profileId] += amount
      if (op.type === 'expense' && op.profileId) byId[op.profileId] -= amount
      if (op.type === 'transfer' && op.fromProfileId && op.toProfileId) {
        byId[op.fromProfileId] -= amount
        byId[op.toProfileId] += amount
      }
      if (op.type === 'goal' && op.profileId) byId[op.profileId] -= amount
    })
    return byId
  }, [operations, profiles])

  const totals = useMemo(() => {
    let income = 0, expense = 0
    operations.forEach(op => {
      const amt = Number(op.amount || 0)
      if (op.type === 'income') income += amt
      if (op.type === 'expense' || op.type === 'goal') expense += amt
    })
    return { income, expense, balance: income - expense }
  }, [operations])

  const totalsByProfile = useMemo(() => {
    const map = {}
    profiles.forEach(p => map[p.id] = { income: 0, expense: 0, balance: 0 })
    operations.forEach(op => {
      const amt = Number(op.amount || 0)
      if (op.type === 'income' && op.profileId) {
        map[op.profileId].income += amt
        map[op.profileId].balance += amt
      }
      if (op.type === 'expense' && op.profileId) {
        map[op.profileId].expense += amt
        map[op.profileId].balance -= amt
      }
      if (op.type === 'transfer' && op.fromProfileId && op.toProfileId) {
        map[op.fromProfileId].expense += amt
        map[op.fromProfileId].balance -= amt
        map[op.toProfileId].income += amt
        map[op.toProfileId].balance += amt
      }
      if (op.type === 'goal' && op.profileId) {
        map[op.profileId].expense += amt
        map[op.profileId].balance -= amt
      }
    })
    return map
  }, [operations, profiles])

  const spentByCategory = useMemo(() => {
    const map = {}
    operations.forEach(op => {
      if (op.type === 'expense' && op.categoryId) {
        map[op.categoryId] = (map[op.categoryId] || 0) + Number(op.amount || 0)
      }
    })
    return map
  }, [operations])

  const savedByGoal = useMemo(() => {
    const map = {}
    operations.forEach(op => {
      if (op.type === 'goal' && op.goalId) {
        map[op.goalId] = (map[op.goalId] || 0) + Number(op.amount || 0)
      }
    })
    return map
  }, [operations])

  function getGoalSaved(goalId) {
    return savedByGoal[goalId] || 0
  }

  // Редактирование цели
  async function editGoal(goalId, updatedGoal) {
    if (!budgetId) return
    try {
      const goalRef = doc(db, 'budgets', budgetId, 'goals', goalId)
      await updateDoc(goalRef, {
        ...updatedGoal,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error editing goal:', error)
      throw error
    }
  }

  // Удаление цели
  async function deleteGoal(goalId) {
    if (!budgetId) return
    try {
      const goalRef = doc(db, 'budgets', budgetId, 'goals', goalId)
      await deleteDoc(goalRef)
    } catch (error) {
      console.error('Error deleting goal:', error)
      throw error
    }
  }

  // Helpers
  function convert(amountPLN) {
    const rate = rates[currency] || 1
    return Number(amountPLN) * rate
  }

  // Budget
  function genCode(len = 6) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let s = ''
    for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
    return s
  }

  async function createBudget() {
    try {
      if (!user) throw new Error('Необходима авторизация')
      
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

      console.log('Budget created, creating profile...')
      
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

      console.log('Categories created, saving budget ID...')
      
      // Сохраняем ID бюджета
      setBudgetId(budgetRef.id)
      setBudgetCode(code)
      localStorage.setItem('budgetId', budgetRef.id)
      localStorage.setItem('budgetCode', code)

      console.log('Budget creation completed successfully')
      return budgetRef.id
    } catch (error) {
      console.error('Error creating budget:', error)
      throw error
    }
  }

  async function joinBudget(idOrCode) {
    const raw = (idOrCode || '').trim()
    if (!raw) throw new Error('Пустой ID/код бюджета')

    const tryId = await getDoc(doc(db, 'budgets', raw))
    if (tryId.exists()) {
      setBudgetId(tryId.id)
      setBudgetCode(tryId.data()?.code || '')
      localStorage.setItem('budgetId', tryId.id)
      if (tryId.data()?.code) localStorage.setItem('budgetCode', tryId.data().code)
      return tryId.id
    }

    const q = query(collection(db, 'budgets'), where('code', '==', raw.toUpperCase()))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const d = snap.docs[0]
      setBudgetId(d.id)
      setBudgetCode(d.data()?.code || '')
      localStorage.setItem('budgetId', d.id)
      if (d.data()?.code) localStorage.setItem('budgetCode', d.data().code)
      return d.id
    }
    throw new Error('Бюджет не найден')
  }

  async function updateBudgetCode(newCode) {
    if (!budgetId) throw new Error('Нет активного бюджета')
    const code = (newCode || '').toUpperCase().replace(/\\s+/g, '')
    if (!code || code.length < 4) throw new Error('Код слишком короткий')
    await updateDoc(doc(db, 'budgets', budgetId), { code })
    setBudgetCode(code)
    localStorage.setItem('budgetCode', code)
  }

  // Categories (emoji + limit)
  async function addCategory(payload) {
    const data = { name: payload.name, emoji: payload.emoji || '📂', limit: payload.limit ? Number(payload.limit) : 0, createdAt: serverTimestamp() }
    await addDoc(collection(db, 'budgets', budgetId, 'categories'), data)
  }
  async function updateCategory(id, payload) {
    const patch = {}
    if (payload.name !== undefined) patch.name = payload.name
    if (payload.emoji !== undefined) patch.emoji = payload.emoji
    if (payload.limit !== undefined) patch.limit = Number(payload.limit) || 0
    await updateDoc(doc(db, 'budgets', budgetId, 'categories', id), patch)
  }
  async function deleteCategory(id) {
    await deleteDoc(doc(db, 'budgets', budgetId, 'categories', id))
  }
  async function setLimitForCategory(id, limit) {
    await updateDoc(doc(db, 'budgets', budgetId, 'categories', id), { limit: Number(limit) || 0 })
  }

  // Goals
  async function addGoal(payload) {
    const data = { name: payload.name, emoji: payload.emoji || '🎯', amount: Number(payload.amount || payload.target || 0), deadline: payload.deadline || '', createdAt: serverTimestamp() }
    await addDoc(collection(db, 'budgets', budgetId, 'goals'), data)
  }
  async function contributeToGoal(goalId, profileId, amount, note='') {
    await addDoc(collection(db, 'budgets', budgetId, 'operations'), {
      type: 'goal',
      goalId, profileId,
      amount: Number(amount),
      note,
      date: new Date().toISOString(),
      createdBy: user?.uid || null,
      createdAt: serverTimestamp()
    })
  }

  // Operations
  async function addOperation(op) {
    await addDoc(collection(db, 'budgets', budgetId, 'operations'), {
      ...op,
      amount: Number(op.amount),
      date: op.date || new Date().toISOString(),
      createdBy: user?.uid || null,
      createdAt: serverTimestamp()
    })
  }
  async function deleteOperation(id) {
    await deleteDoc(doc(db, 'budgets', budgetId, 'operations', id))
  }

  // Получение текущего профиля пользователя
  const getCurrentUserProfile = () => {
    if (!user) return null
    
    // Сначала ищем профиль по userId
    let userProfile = profiles.find(p => p.userId === user.uid)
    
    if (userProfile) {
      return userProfile
    }
    
    // Если профиль не найден, пытаемся найти по email или создать новый
    console.log('🔍 Profile not found for user:', user.uid, user.email)
    
    // Ищем незакрепленный профиль, который может подойти пользователю
    const unclaimed = profiles.find(p => !p.userId)
    if (unclaimed) {
      console.log('🎯 Found unclaimed profile:', unclaimed.name)
      // Автоматически привязываем первый незакрепленный профиль
      assignProfileToUser(unclaimed.id, user.uid)
      return { ...unclaimed, userId: user.uid }
    }
    
    // Если нет незакрепленных профилей, создаем новый
    console.log('➕ Creating new profile for user')
    return null // Будет создан автоматически
  }

  // Функция привязки профиля к пользователю
  async function assignProfileToUser(profileId, userId) {
    try {
      await updateDoc(doc(db, 'budgets', budgetId, 'profiles', profileId), {
        userId: userId,
        lastLogin: serverTimestamp()
      })
      console.log(`✅ Profile ${profileId} assigned to user ${userId}`)
    } catch (error) {
      console.error('❌ Failed to assign profile:', error)
    }
  }

  // Создание профиля для нового пользователя
  async function createProfileForUser(userName = null) {
    if (!user || !budgetId) return null
    
    try {
      const profileName = userName || user.email?.split('@')[0] || 'Новый пользователь'
      
      const newProfile = {
        name: profileName,
        userId: user.uid,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        online: false,
        lastSeen: null
      }
      
      const docRef = await addDoc(collection(db, 'budgets', budgetId, 'profiles'), newProfile)
      console.log(`✅ Created new profile: ${profileName} for user ${user.uid}`)
      
      return { id: docRef.id, ...newProfile }
    } catch (error) {
      console.error('❌ Failed to create profile:', error)
      return null
    }
  }

  // Presence - улучшенная версия
  async function setOnlineStatus(profileId, isOnline, deviceType = 'desktop') {
    try {
      await updateDoc(doc(db, 'budgets', budgetId, 'profiles', profileId), {
        online: isOnline,
        deviceType: deviceType,
        lastSeen: serverTimestamp(),
        userId: user?.uid || null
      })
      console.log(`🟢 Profile ${profileId} status: ${isOnline ? 'online' : 'offline'} on ${deviceType}`)
    } catch (error) {
      console.error('❌ Failed to update online status:', error)
    }
  }

  // Выход из семьи
  async function leaveFamily() {
    if (!budgetId || !user) {
      console.error('❌ Cannot leave family: no budget or user')
      return false
    }

    try {
      const currentProfile = getCurrentUserProfile()
      if (!currentProfile) {
        console.error('❌ Cannot leave family: profile not found')
        return false
      }

      // Удаляем профиль пользователя из семьи
      await deleteDoc(doc(db, 'budgets', budgetId, 'profiles', currentProfile.id))
      
      // Очищаем локальные данные
      setBudgetId(null)
      setBudgetCode('')
      localStorage.removeItem('budgetId')
      localStorage.removeItem('budgetCode')
      
      // Очищаем состояние
      setProfiles([])
      setCategories([])
      setGoals([])
      setOperations([])

      console.log('✅ Successfully left family')
      return true
    } catch (error) {
      console.error('❌ Failed to leave family:', error)
      return false
    }
  }

  const value = {
    budgetId, setBudgetId,
    budgetCode, updateBudgetCode,
    createBudget, joinBudget, leaveFamily,

    profiles, categories, goals, operations,
    getCurrentUserProfile, assignProfileToUser, createProfileForUser,

    addCategory, updateCategory, deleteCategory, setLimitForCategory,
    addGoal, editGoal, deleteGoal, contributeToGoal, getGoalSaved,
    addOperation, deleteOperation,

    balances, totals, totalsByProfile,
    spentByCategory, savedByGoal,

    currency, setCurrency,
    theme, setTheme, toggleTheme,
    rates, convert,

    setOnlineStatus
  }

  return <BudgetCtx.Provider value={value}>{children}</BudgetCtx.Provider>
}

export function useBudget() {
  return useContext(BudgetCtx)
}
