import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '../firebase/auth.jsx'

const BudgetCtx = createContext(null)

export function BudgetProvider({ children }) {
  const { user } = useAuth()

  // Простое состояние без семей
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

  // Загружаем базовые категории при первом запуске
  useEffect(() => {
    if (!user) {
      setCategories([])
      setGoals([])
      setOperations([])
      return
    }

    // Базовые категории
    const defaultCategories = [
      { id: '1', name: 'Зарплата', emoji: '💰', type: 'income', limit: 0 },
      { id: '2', name: 'Фриланс', emoji: '💻', type: 'income', limit: 0 },
      { id: '3', name: 'Еда', emoji: '🍕', type: 'expense', limit: 0 },
      { id: '4', name: 'Транспорт', emoji: '🚗', type: 'expense', limit: 0 },
      { id: '5', name: 'Развлечения', emoji: '🎮', type: 'expense', limit: 0 },
      { id: '6', name: 'Прочее', emoji: '📝', type: 'both', limit: 0 }
    ]

    setCategories(defaultCategories)
  }, [user])

  const value = {
    // Состояние
    user,
    categories,
    goals,
    operations,
    currency,
    rates,
    theme,
    
    // Действия
    toggleTheme,
    setCurrency,
    setCategories,
    setGoals,
    setOperations
  }

  return <BudgetCtx.Provider value={value}>{children}</BudgetCtx.Provider>
}

export function useBudget() {
  const context = useContext(BudgetCtx)
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider')
  }
  return context
}