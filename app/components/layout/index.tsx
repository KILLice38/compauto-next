import { useEffect, useState } from 'react'
import { useMediaQuery } from 'react-responsive'
import { Outlet } from 'react-router-dom'
import Footer from '../footer'
import Header from '../header'
import Nav from '../nav'

const Layout = () => {
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })
  const [isNavOpen, setIsNavOpen] = useState(false)

  useEffect(() => {
    if (isNavOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isNavOpen])

  return (
    <>
      <Header setIsNavOpen={setIsNavOpen} isNavOpen={isNavOpen} />
      {!isMobile && <Nav setIsNavOpen={setIsNavOpen} />}
      {isMobile && isNavOpen && <Nav setIsNavOpen={setIsNavOpen} />}
      <Outlet />
      <Footer />
    </>
  )
}

export default Layout
