"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ChevronRight, Pen } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import posthog from "posthog-js"
import {
  ImageDistortionEffect,
  ImageDistortionEffectRef
} from "./image-distortion-effect"

export const HeroSection = () => {
  const heroRef = useRef<HTMLDivElement>(null)
  const distortionRef = useRef<ImageDistortionEffectRef>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [isEffectLoaded, setIsEffectLoaded] = useState(false)

  // Handle mouse events for distortion effect
  useEffect(() => {
    const heroElement = heroRef.current
    if (!heroElement || !distortionRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      if (distortionRef.current) {
        distortionRef.current.handleMouseMove(e.clientX, e.clientY)
      }
    }

    const handleMouseEnter = () => {
      setIsHovering(true)
      if (distortionRef.current) {
        distortionRef.current.handleMouseEnter()
      }
    }

    const handleMouseLeave = () => {
      setIsHovering(false)
      if (distortionRef.current) {
        distortionRef.current.handleMouseLeave()
      }
    }

    // Add event listeners
    heroElement.addEventListener("mousemove", handleMouseMove)
    heroElement.addEventListener("mouseenter", handleMouseEnter)
    heroElement.addEventListener("mouseleave", handleMouseLeave)

    // Handle touch events for mobile
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return

      const touch = e.touches[0]

      if (distortionRef.current) {
        distortionRef.current.handleMouseMove(touch.clientX, touch.clientY)
      }
    }

    heroElement.addEventListener("touchmove", handleTouchMove)

    return () => {
      heroElement.removeEventListener("mousemove", handleMouseMove)
      heroElement.removeEventListener("mouseenter", handleMouseEnter)
      heroElement.removeEventListener("mouseleave", handleMouseLeave)
      heroElement.removeEventListener("touchmove", handleTouchMove)
    }
  }, [])

  // Handle the Get Started button click for analytics
  const handleGetStartedClick = () => {
    posthog.capture("clicked_get_started")
  }

  // Predefined action lines to prevent hydration errors
  const actionLines = [
    { width: "35%", top: "15%", left: "5%", transform: "rotate(-2deg)" },
    { width: "52%", top: "32%", left: "12%", transform: "rotate(-4deg)" },
    { width: "40%", top: "48%", left: "8%", transform: "rotate(3deg)" },
    { width: "45%", top: "62%", left: "14%", transform: "rotate(-1deg)" },
    { width: "38%", top: "75%", left: "6%", transform: "rotate(2deg)" },
    { width: "55%", top: "85%", left: "10%", transform: "rotate(-3deg)" },
    { width: "42%", top: "25%", left: "7%", transform: "rotate(1deg)" },
    { width: "48%", top: "55%", left: "4%", transform: "rotate(-2deg)" },
    { width: "36%", top: "68%", left: "9%", transform: "rotate(4deg)" },
    { width: "50%", top: "38%", left: "3%", transform: "rotate(-1deg)" }
  ]

  // Handler for distortion effect loading
  const handleEffectLoaded = () => {
    setIsEffectLoaded(true)
  }

  return (
    <div
      ref={heroRef}
      className="relative h-[500px] overflow-hidden sm:h-[550px] md:h-[600px] lg:h-[650px] xl:h-[700px]"
      style={{
        background:
          "linear-gradient(145deg, rgba(46, 38, 30, 0.97) 0%, rgba(22, 28, 24, 0.95) 100%)"
      }}
    >
      {/* Fallback image while WebGL loads */}
      <div
        className="absolute inset-0 z-[2] size-full"
        style={{
          opacity: isEffectLoaded ? 0 : 1,
          transition: "opacity 0.5s ease-in-out"
        }}
      >
        <Image
          src="/hero.png"
          alt="HandFont background"
          fill
          priority
          sizes="100vw"
          quality={95}
          className="object-cover object-center"
          onLoad={() => setIsImageLoaded(true)}
        />
      </div>

      {/* WebGL Distortion Effect */}
      <div className="absolute inset-0 size-full">
        <ImageDistortionEffect
          ref={distortionRef}
          imageSrc="/hero.png"
          onLoad={handleEffectLoaded}
        />
      </div>

      {/* Grain texture overlay */}
      <div className="bg-noise pointer-events-none absolute inset-0 z-[4] opacity-[0.07] mix-blend-overlay"></div>

      {/* Vignette effect */}
      <div className="bg-radial-gradient pointer-events-none absolute inset-0 z-[4]"></div>

      {/* Content with improved contrast and readability */}
      <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center px-6 sm:px-8">
        <div className="mx-auto w-full max-w-screen-xl">
          {/* Comic-book style badge/logo with teal accent */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mx-auto mb-12 w-fit rotate-[-2deg] rounded-lg border-4 border-black bg-teal-700 px-4 py-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]"
            whileHover={{ scale: 1.05, rotate: 0 }}
          >
            <div className="flex items-center gap-1 text-base font-black tracking-wider text-white">
              <span
                className="font-extrabold text-white"
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: "1.25rem",
                  fontWeight: 900,
                  letterSpacing: "0.05em"
                }}
              >
                Turn your handwriting into a font!
              </span>
              <ChevronRight className="ml-1 size-3 text-white" />
            </div>
          </motion.div>

          {/* Comic-book style heading with dramatic effect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative text-center"
          >
            {/* Heading with simplified shadow */}
            <motion.h1
              className="relative z-[1] text-6xl font-black uppercase text-white sm:text-7xl md:text-8xl"
              style={{
                fontFamily: "Arial, sans-serif",
                textShadow: "4px 4px 0px #000",
                WebkitTextStroke: "2px black"
              }}
            >
              Create your
              <br />
              personal font.
            </motion.h1>

            {/* Comic-style action lines with teal accents */}
            <motion.div
              className="absolute inset-0 -z-[1] opacity-25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.25 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              {actionLines.map((line, i) => (
                <div
                  key={i}
                  className={`absolute ${i % 3 === 0 ? "bg-teal-500" : "bg-amber-500"}`}
                  style={{
                    height: "2px",
                    width: line.width,
                    top: line.top,
                    left: line.left,
                    transform: line.transform
                  }}
                />
              ))}
            </motion.div>

            {/* Decorative comic-book style separator */}
            <div className="relative mt-5 h-10">
              <motion.div
                className="relative mx-auto h-2 w-40 bg-black sm:w-60"
                initial={{ width: 0 }}
                animate={{ width: "60%" }}
                transition={{ duration: 0.8, delay: 1.1 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-amber-500 via-teal-500 to-amber-500"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 1.5, delay: 1.3 }}
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Comic-book style description panel with improved styling */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
            className="relative mx-auto mt-10 max-w-2xl"
            whileHover={{ y: -5 }}
          >
            <div className="rotate-1 rounded-lg border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.7)]">
              {/* Speech bubble pointer with refined design */}
              <div className="absolute -top-5 left-1/2 z-[-1] size-8 -translate-x-1/2 rotate-45 border-x-4 border-t-4 border-black bg-white" />

              <p
                className="text-center text-lg font-bold leading-relaxed text-black md:text-xl"
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                HandFont turns your unique handwriting into a digital font you
                can use anywhere.
                <span className="border-b-2 border-teal-500 bg-amber-100 px-1">
                  Write, capture, and create
                </span>{" "}
                - it's that simple!
              </p>
            </div>
          </motion.div>

          {/* Comic-book style CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
            className="relative mt-12 flex justify-center"
            whileHover={{ scale: 1.05, rotate: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href="/fonts"
              onClick={handleGetStartedClick}
              className="group relative"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              {/* Comic action burst behind button */}
              <motion.div
                className="absolute -inset-4 z-[-1] rotate-12 rounded-[30%] bg-gradient-to-br from-amber-500 to-teal-600"
                initial={{ scale: 0.8, opacity: 0.7 }}
                animate={{
                  scale: isHovering ? [0.9, 1.1, 0.9] : 0.9,
                  opacity: isHovering ? 1 : 0.7,
                  rotate: isHovering ? 5 : 12
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              />

              {/* Spiky burst effect with teal accents */}
              {isHovering && (
                <motion.div
                  className="absolute -inset-6"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className={`absolute h-3 w-10 ${i % 2 === 0 ? "bg-amber-400" : "bg-teal-400"}`}
                      style={{
                        left: "50%",
                        top: "50%",
                        originX: 0,
                        rotate: i * 45
                      }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </motion.div>
              )}

              {/* Comic-style button with improved design */}
              <Button className="relative h-auto rounded-lg border-4 border-black bg-amber-600 px-8 py-6 text-xl font-black uppercase text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Pen className="mr-2 size-5 text-teal-200" />
                Get Started!
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Bottom decorative elements - comic style with teal accent */}
      <div className="absolute inset-x-0 bottom-0 z-[5] h-20 bg-gradient-to-t from-black to-transparent">
        <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-r from-amber-600 via-teal-700 to-amber-600"></div>
      </div>

      {/* Comic-book style scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 z-[6] -translate-x-1/2 rounded-lg border-2 border-black bg-white p-2 text-xs font-bold uppercase text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]"
        animate={{
          y: [0, 10, 0]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "loop"
        }}
      >
        Scroll Down!
      </motion.div>
    </div>
  )
}
