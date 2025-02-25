/*
<ai_context>
This client component provides the header for the app.
</ai_context>
*/

"use client"

import { Button } from "@/components/ui/button"
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton
} from "@clerk/nextjs"
import { Menu, PenLine, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ThemeSwitcher } from "./utilities/theme-switcher"

const navLinks = [
  { href: "/fonts", label: "My Fonts" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" }
]

const signedInLinks = [{ href: "/fonts/create", label: "Create Font" }]

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isHeroVisible, setIsHeroVisible] = useState(true)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  useEffect(() => {
    const handleScroll = () => {
      // Update standard scroll state
      setIsScrolled(window.scrollY > 0)

      // Detect if we've scrolled past the hero section
      const heroHeight =
        document.querySelector('div[class*="min-h-[90vh]"]')?.clientHeight ||
        800
      setIsHeroVisible(window.scrollY < heroHeight - 100)
    }

    window.addEventListener("scroll", handleScroll)
    // Run once on mount to set initial state
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/80 shadow-sm backdrop-blur-md"
          : isHeroVisible
            ? "bg-transparent"
            : "bg-background/90 shadow-sm backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between p-4">
        <div
          className={`flex items-center space-x-2 hover:cursor-pointer ${
            isHeroVisible && !isScrolled ? "-rotate-2 font-black" : ""
          }`}
        >
          <div
            className={`transition-all duration-300 ${
              isHeroVisible && !isScrolled
                ? "rounded border-2 border-black bg-amber-600 p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                : ""
            }`}
          >
            <PenLine
              className={`size-6 ${isHeroVisible && !isScrolled ? "text-white" : ""}`}
            />
          </div>
          <Link
            href="/"
            className={`relative z-[1] text-4xl font-black uppercase text-white sm:text-2xl md:text-2xl ${
              isHeroVisible && !isScrolled ? "" : ""
            }`}
            style={{
              fontFamily: "Arial, sans-serif",
              textShadow: "4px 4px 0px #000",
              WebkitTextStroke: "2px black"
            }}
          >
            HandFont
          </Link>
        </div>

        <nav
          className={`absolute left-1/2 hidden -translate-x-1/2 md:flex ${
            isHeroVisible && !isScrolled
              ? "rounded-lg border-2 border-black bg-amber-600 px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] backdrop-blur-sm dark:bg-amber-600"
              : "space-x-2"
          }`}
        >
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1 transition-colors ${
                isHeroVisible && !isScrolled
                  ? "font-bold text-white hover:bg-amber-500 dark:text-white dark:hover:bg-amber-500"
                  : "hover:opacity-80"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <SignedIn>
            {signedInLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1 transition-colors ${
                  isHeroVisible && !isScrolled
                    ? "font-bold text-white hover:bg-amber-500 dark:text-white dark:hover:bg-amber-500"
                    : "hover:opacity-80"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </SignedIn>
        </nav>

        <div className="flex items-center space-x-4">
          <ThemeSwitcher />

          <SignedOut>
            <div
              className={`${
                isHeroVisible && !isScrolled
                  ? "rounded-lg border-2 border-black bg-amber-600 px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:bg-amber-600"
                  : ""
              }`}
            >
              <SignInButton>
                <Button
                  variant={
                    isHeroVisible && !isScrolled ? "secondary" : "outline"
                  }
                  className={
                    isHeroVisible && !isScrolled
                      ? "border-2 border-black bg-white font-bold hover:bg-white/80"
                      : ""
                  }
                >
                  Login
                </Button>
              </SignInButton>

              <SignUpButton>
                <Button
                  className={
                    isHeroVisible && !isScrolled
                      ? "border-2 border-black bg-white font-bold text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-white/80"
                      : "bg-amber-600 hover:bg-amber-700"
                  }
                >
                  Sign Up
                </Button>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <div
              className={`${
                isHeroVisible && !isScrolled
                  ? "rounded-lg border-2 border-black bg-amber-600 p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:bg-amber-600"
                  : ""
              }`}
            >
              <UserButton />
            </div>
          </SignedIn>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              aria-label="Toggle menu"
              className={isHeroVisible && !isScrolled ? "text-white" : ""}
            >
              {isMenuOpen ? (
                <X className="size-6" />
              ) : (
                <Menu className="size-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <nav
          className={`p-4 md:hidden ${
            isHeroVisible && !isScrolled
              ? "border-y-4 border-black bg-white/95 font-bold text-black backdrop-blur-md dark:bg-gray-900/95 dark:text-white"
              : "bg-primary-foreground text-primary"
          }`}
        >
          <ul className="space-y-2">
            <li>
              <Link
                href="/"
                className="block hover:underline"
                onClick={toggleMenu}
              >
                Home
              </Link>
            </li>
            {navLinks.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block hover:underline"
                  onClick={toggleMenu}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <SignedIn>
              {signedInLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block hover:underline"
                    onClick={toggleMenu}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </SignedIn>
          </ul>
        </nav>
      )}
    </header>
  )
}
