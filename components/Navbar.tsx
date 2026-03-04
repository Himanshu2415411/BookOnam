'use client'
import Link from 'next/link'
import React from 'react'
import { usePathname } from 'next/navigation';
import {cn} from "@/lib/utils"
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser
} from "@clerk/nextjs"

const navItems = [
  {label : "Library", href: "/"},
  {label : "Add New", href: "/books/new"},
  {label : "Pricing", href: "/subscriptions"},
]

const Navbar = () => {
  const pathName = usePathname();
  const {user} = useUser();
  return (
    <header className ="w-full fixed z-50 bg-[var(--bg-primary)]">
      <div className="wrapper navbar-height py-4 flex justify-between items-center">
      <Link href= "/" className="flex gap-0.5 items-center">
        <img src = "/assets/logo.png" alt="BookOnam" width ={42} height ={26} />
        <span className='logo-text'>BookOnam</span>
      </Link>

      <nav className='w-fit flex gap-7.5 items-center'>
            {navItems.map(({label,href}) => {
              const isActive = pathName === href || (href !== '/' && pathName.startsWith(href));
              return (
                <Link href={href} key= {label} className={cn('nav-link-base', isActive ? 'nav-link-active' : 'text-black hover:opacity-70')}>{label}</Link>
              )
            })}
            <div className='flex gap-7.5 items-center'>
              <SignedOut>
                <SignInButton>
                  <button className="text-black font-medium hover:opacity-70 transition-opacity">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="text-black font-medium hover:opacity-70 transition-opacity">
                    Sign Up
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <div className='nav-user-link'>
                  <UserButton />
                  {user?.firstName && (
                    <Link href="/subscriptions" className="nav-user-name">
                      {user.firstName}
                    </Link>
                  )}
                </div>
              </SignedIn>
            </div>
      </nav>
    </div>
    </header>
  )
}

export default Navbar
