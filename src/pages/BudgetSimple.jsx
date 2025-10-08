import React from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../firebase/auth.jsx'

export default function Budget() {
  const { user } = useAuth()

  // Проверяем авторизацию
  if (!user) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Требуется авторизация</h2>
        <p className="text-zinc-400">Пожалуйста, войдите или зарегистрируйтесь</p>
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Заголовок */}
      <motion.div variants={itemVariants} className="text-center space-y-4">
        <div className="space-y-2">
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            👨‍👩‍👧‍👦 Личный бюджет
          </h1>
          <p className="text-zinc-400 text-lg">
            Управление личными финансами
          </p>
        </div>
      </motion.div>

      {/* Информация о пользователе */}
      <motion.div variants={itemVariants} className="card p-6">
        <h2 className="text-xl font-bold mb-4">👤 Профиль</h2>
        <div className="space-y-2">
          <p><span className="text-zinc-400">Email:</span> {user.email}</p>
          <p><span className="text-zinc-400">UID:</span> {user.uid}</p>
        </div>
      </motion.div>

      {/* Статистика */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <div className="text-3xl mb-2">💰</div>
          <h3 className="text-lg font-semibold">Доходы</h3>
          <p className="text-2xl font-bold text-green-400">0 PLN</p>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-3xl mb-2">💸</div>
          <h3 className="text-lg font-semibold">Расходы</h3>
          <p className="text-2xl font-bold text-red-400">0 PLN</p>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-3xl mb-2">📊</div>
          <h3 className="text-lg font-semibold">Баланс</h3>
          <p className="text-2xl font-bold text-blue-400">0 PLN</p>
        </div>
      </motion.div>

      {/* Информация */}
      <motion.div variants={itemVariants} className="card p-6">
        <h2 className="text-xl font-bold mb-4">ℹ️ Информация</h2>
        <div className="text-zinc-400 space-y-2">
          <p>Это упрощенная версия приложения для управления личным бюджетом.</p>
          <p>Используйте разделы "Категории", "Операции" и "Цели" для ведения учета.</p>
          <p>Семейная функция временно отключена для упрощения интерфейса.</p>
        </div>
      </motion.div>
    </motion.div>
  )
}