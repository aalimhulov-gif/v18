import React, { createContext, useContext, useState, useEffect } from 'react'
import { db } from '../firebase/firebaseConfig.js'
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  orderBy 
} from 'firebase/firestore'
import { useAuth } from '../firebase/auth.jsx'

const BudgetContext = createContext()

export function useBudget() {
  const context = useContext(BudgetContext)
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider')
  }
  return context
}

export function BudgetProvider({ children }) {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [operations, setOperations] = useState([])
  const [loading, setLoading] = useState(true)

  // Настройки
  const [theme, setTheme] = useState('dark')
  const [currency, setCurrency] = useState('RUB')

  // ID общего бюджета (одинаковый для всех пользователей)
  const SHARED_BUDGET_ID = 'shared_budget_v1'

  // Инициализация подписок на Firestore
  useEffect(() => {
    if (!user) {
      setCategories([])
      setOperations([])
      setLoading(false)
      return
    }

    console.log('🔥 Настройка подписок Firestore для пользователя:', user.email)

    // Подписка на категории
    const categoriesRef = collection(db, 'budgets', SHARED_BUDGET_ID, 'categories')
    const categoriesQuery = query(categoriesRef, orderBy('createdAt', 'asc'))
    
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      console.log('📂 Категории обновлены:', categoriesData.length)
      setCategories(categoriesData)
    }, (error) => {
      console.error('❌ Ошибка подписки на категории:', error)
    })

    // Подписка на операции
    const operationsRef = collection(db, 'budgets', SHARED_BUDGET_ID, 'operations')
    const operationsQuery = query(operationsRef, orderBy('createdAt', 'desc'))
    
    const unsubscribeOperations = onSnapshot(operationsQuery, (snapshot) => {
      const operationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      console.log('💰 Операции обновлены:', operationsData.length)
      setOperations(operationsData)
      setLoading(false)
    }, (error) => {
      console.error('❌ Ошибка подписки на операции:', error)
      setLoading(false)
    })

    // Очистка подписок
    return () => {
      console.log('🧹 Отключение подписок Firestore')
      unsubscribeCategories()
      unsubscribeOperations()
    }
  }, [user])

  // Добавление категории
  const addCategory = async (categoryData) => {
    if (!user) return

    try {
      const categoriesRef = collection(db, 'budgets', SHARED_BUDGET_ID, 'categories')
      await addDoc(categoriesRef, {
        ...categoryData,
        createdAt: serverTimestamp(),
        createdBy: user.email
      })
      console.log('✅ Категория добавлена')
    } catch (error) {
      console.error('❌ Ошибка добавления категории:', error)
      throw error
    }
  }

  // Обновление категории
  const updateCategory = async (categoryId, updates) => {
    if (!user) return

    try {
      const categoryRef = doc(db, 'budgets', SHARED_BUDGET_ID, 'categories', categoryId)
      await updateDoc(categoryRef, {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: user.email
      })
      console.log('✅ Категория обновлена')
    } catch (error) {
      console.error('❌ Ошибка обновления категории:', error)
      throw error
    }
  }

  // Удаление категории
  const deleteCategory = async (categoryId) => {
    if (!user) return

    try {
      const categoryRef = doc(db, 'budgets', SHARED_BUDGET_ID, 'categories', categoryId)
      await deleteDoc(categoryRef)
      console.log('✅ Категория удалена')
    } catch (error) {
      console.error('❌ Ошибка удаления категории:', error)
      throw error
    }
  }

  // Добавление операции
  const addOperation = async (operationData) => {
    if (!user) return

    try {
      const operationsRef = collection(db, 'budgets', SHARED_BUDGET_ID, 'operations')
      await addDoc(operationsRef, {
        ...operationData,
        amount: parseFloat(operationData.amount),
        createdAt: serverTimestamp(),
        createdBy: user.email,
        userEmail: user.email
      })
      console.log('✅ Операция добавлена')
    } catch (error) {
      console.error('❌ Ошибка добавления операции:', error)
      throw error
    }
  }

  // Обновление операции
  const updateOperation = async (operationId, updates) => {
    if (!user) return

    try {
      const operationRef = doc(db, 'budgets', SHARED_BUDGET_ID, 'operations', operationId)
      await updateDoc(operationRef, {
        ...updates,
        amount: updates.amount ? parseFloat(updates.amount) : undefined,
        updatedAt: serverTimestamp(),
        updatedBy: user.email
      })
      console.log('✅ Операция обновлена')
    } catch (error) {
      console.error('❌ Ошибка обновления операции:', error)
      throw error
    }
  }

  // Удаление операции
  const deleteOperation = async (operationId) => {
    if (!user) return

    try {
      const operationRef = doc(db, 'budgets', SHARED_BUDGET_ID, 'operations', operationId)
      await deleteDoc(operationRef)
      console.log('✅ Операция удалена')
    } catch (error) {
      console.error('❌ Ошибка удаления операции:', error)
      throw error
    }
  }

  // Вычисление общих сумм
  const totals = {
    income: operations
      .filter(op => op.type === 'income')
      .reduce((sum, op) => sum + (op.amount || 0), 0),
    expense: operations
      .filter(op => op.type === 'expense')
      .reduce((sum, op) => sum + (op.amount || 0), 0)
  }
  totals.balance = totals.income - totals.expense

  // Функция конвертации валют (заглушка)
  const convert = (amount, from = currency, to = currency) => {
    return amount // Пока без конвертации
  }

  // Переключение темы
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const value = {
    // Данные
    categories,
    operations,
    totals,
    loading,
    
    // Настройки
    theme,
    currency,
    
    // Методы
    addCategory,
    updateCategory,
    deleteCategory,
    addOperation,
    updateOperation,
    deleteOperation,
    convert,
    toggleTheme,
    
    // Информация
    budgetId: SHARED_BUDGET_ID,
    userEmail: user?.email
  }

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  )
}