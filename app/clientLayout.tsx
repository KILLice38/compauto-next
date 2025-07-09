'use client'

import './globals.scss'
import { useEffect, useState } from 'react'
import { useMediaQuery } from 'react-responsive'
import Header from './components/header'
import Nav from './components/nav'
import Footer from './components/footer'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })
  const [isNavOpen, setIsNavOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isNavOpen ? 'hidden' : 'auto'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isNavOpen])

  return (
    <>
      <Header setIsNavOpen={setIsNavOpen} isNavOpen={isNavOpen} />
      {(!isMobile || isNavOpen) && <Nav setIsNavOpen={setIsNavOpen} />}
      <main>{children}</main>
      <Footer />
    </>
  )
}
