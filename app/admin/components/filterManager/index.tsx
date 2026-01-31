'use client'

import { useState, useEffect } from 'react'
import { useUI } from '../../context/UIContext'
import styles from './filterManager.module.scss'

interface FilterOption {
  id: number
  value: string
}

interface Filters {
  autoMark: FilterOption[]
  engineModel: FilterOption[]
  compressor: FilterOption[]
}

const FILTER_LABELS = {
  autoMark: 'Марки автомобилей',
  engineModel: 'Модели двигателя',
  compressor: 'Типы компрессора',
} as const

export default function FilterManager({ onClose }: { onClose: () => void }) {
  const { confirm, toast } = useUI()
  const [filters, setFilters] = useState<Filters>({
    autoMark: [],
    engineModel: [],
    compressor: [],
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<keyof Filters>('autoMark')
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadFilters()
  }, [])

  async function loadFilters() {
    try {
      const res = await fetch('/api/filters')
      if (!res.ok) throw new Error('Failed to load filters')
      const data = await res.json()
      setFilters(data)
    } catch (err) {
      console.error('Error loading filters:', err)
      setError('Ошибка загрузки фильтров')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!newValue.trim()) {
      setError('Введите значение')
      return
    }

    setAdding(true)
    setError('')

    try {
      const res = await fetch('/api/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          value: newValue.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add filter')
      }

      const newFilter = await res.json()
      setFilters((prev) => ({
        ...prev,
        [activeTab]: [...prev[activeTab], { id: newFilter.id, value: newFilter.value }].sort((a, b) =>
          a.value.localeCompare(b.value)
        ),
      }))
      setNewValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при добавлении')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: number, value: string) {
    const confirmed = await confirm({
      title: 'Удаление фильтра',
      message: `Вы уверены, что хотите удалить "${value}"?`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      variant: 'danger',
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/filters/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || data.error || 'Failed to delete filter')
      }

      setFilters((prev) => ({
        ...prev,
        [activeTab]: prev[activeTab].filter((f) => f.id !== id),
      }))

      toast.success(`Фильтр "${value}" удалён`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка при удалении')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !adding) {
      handleAdd()
    }
  }

  if (loading) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Управление фильтрами</h2>
          <button onClick={onClose} className={styles.closeButton} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div className={styles.tabs}>
          {(Object.keys(FILTER_LABELS) as Array<keyof Filters>).map((type) => (
            <button
              key={type}
              className={`${styles.tab} ${activeTab === type ? styles.active : ''}`}
              onClick={() => setActiveTab(type)}
            >
              {FILTER_LABELS[type]}
            </button>
          ))}
        </div>

        <div className={styles.content}>
          <div className={styles.addSection}>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Добавить ${FILTER_LABELS[activeTab].toLowerCase()}`}
              className={styles.input}
              disabled={adding}
            />
            <button onClick={handleAdd} disabled={adding || !newValue.trim()} className={styles.addButton}>
              {adding ? 'Добавление...' : 'Добавить'}
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.list}>
            {filters[activeTab].length === 0 ? (
              <p className={styles.empty}>Нет добавленных значений</p>
            ) : (
              filters[activeTab].map((filter) => (
                <div key={filter.id} className={styles.item}>
                  <span>{filter.value}</span>
                  <button
                    onClick={() => handleDelete(filter.id, filter.value)}
                    className={styles.deleteButton}
                    aria-label={`Удалить ${filter.value}`}
                  >
                    Удалить
                  </button>
                </div>
              ))
            )}
          </div>

          <div className={styles.footer}>
            <p className={styles.hint}>
              💡 Добавленные фильтры будут доступны при создании и редактировании товаров
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
