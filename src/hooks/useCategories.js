import { useState, useEffect } from 'react'

const KEY = 'my_tasks_categories_v1'
const DEFAULTS = ['Trabalho', 'Pessoal', 'Saúde', 'Estudos', 'Casa']

function load() {
  try {
    const saved = localStorage.getItem(KEY)
    return saved ? JSON.parse(saved) : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function useCategories() {
  const [categories, setCategories] = useState(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(categories))
  }, [categories])

  function addCategory(name) {
    const trimmed = name.trim()
    if (!trimmed || categories.includes(trimmed)) return
    setCategories(prev => [...prev, trimmed])
  }

  function removeCategory(name) {
    setCategories(prev => prev.filter(c => c !== name))
  }

  return { categories, addCategory, removeCategory }
}
