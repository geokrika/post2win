'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'el' | 'en'

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  el: {
    jackpot: '💰 Jackpot',
    my_balance: 'Υπόλοιπο',
    my_posts: '📁 Τα Posts μου',
    new_post: '✨ Νέο Post',
    logout: '🚪 Έξοδος',
    login: '🔑 Σύνδεση',
    register: '✨ Εγγραφή',
    hourly_draw_in: 'Επόμενη Ωριαία Κλήρωση σε',
    winners_history: '📜 Ιστορικό Νικητών',
    last_winner: '🏆 Νικητής Τελευταίας Κλήρωσης',
    winner_prize: 'Έπαθλο Νικητή (70%)',
    supporters_share: 'Μοιράστηκαν Υποστηρικτές (30%)',
    ugc_posts: '🔥 Δημοσιεύσεις UGC',
    tickets: 'Λαχνοί',
    bet_prompt: '🎯 Ποντάρετε για να αυξήσετε τους λαχνούς!',
    no_posts: 'Δεν υπάρχουν ακόμα δημοσιεύσεις. Γίνε ο πρώτος που θα αναρτήσει!',
    supporters: '👥 Υποστηρικτές',
  },
  en: {
    jackpot: '💰 Jackpot',
    my_balance: 'Balance',
    my_posts: '📁 My Posts',
    new_post: '✨ New Post',
    logout: '🚪 Logout',
    login: '🔑 Login',
    register: '✨ Register',
    hourly_draw_in: 'Next Hourly Draw in',
    winners_history: '📜 Winners History',
    last_winner: '🏆 Last Draw Winner',
    winner_prize: 'Winner Prize (70%)',
    supporters_share: 'Supporters Shared (30%)',
    ugc_posts: '🔥 UGC Posts',
    tickets: 'Tickets',
    bet_prompt: '🎯 Place a bet to increase your tickets!',
    no_posts: 'No posts yet. Be the first one to create a post!',
    supporters: '👥 Supporters',
  },
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'el',
  setLang: () => {},
  t: (key) => key,
})

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>('el')

  useEffect(() => {
    const savedLang = localStorage.getItem('ugc_lang') as Language
    if (savedLang === 'el' || savedLang === 'en') {
      setLangState(savedLang)
    }
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('ugc_lang', newLang)
  }

  const t = (key: string): string => {
    return translations[lang][key] || key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)