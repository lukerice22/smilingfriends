"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  motion,
  AnimatePresence,
  useMotionValue,
  type PanInfo,
} from "framer-motion"

// ---------- Types ----------
type Vec = { x: number; y: number }

interface PhysicsRefs {
  alanPosRef: React.MutableRefObject<Vec | null>
  alanActiveRef: React.MutableRefObject<boolean>
}

// ---------- Charlie: flees from cursor ----------
function CursorAverseCharlie() {
  const [pos, setPos] = useState<Vec>({ x: 0, y: 0 })
  const [phrase, setPhrase] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [panicLevel, setPanicLevel] = useState(0)
  const cooldownRef = useRef(0)

  useEffect(() => {
    setMounted(true)
    setPos({ x: window.innerWidth * 0.22, y: window.innerHeight * 0.42 })
  }, [])

  const flee = useCallback(() => {
    const pad = 220
    const w = window.innerWidth
    const h = window.innerHeight
    setPos({
      x: Math.random() * (w - pad * 2) + pad,
      y: Math.random() * (h - pad * 2) + pad,
    })
    const phrases = ["GET AWAY MAN!!", "fug you pimp", "NOPE NOPE", "PIM HELP!!", "what the sig", "HEY MAN COME ON"]
    setPhrase(phrases[Math.floor(Math.random() * phrases.length)])
    setPanicLevel((p) => Math.min(p + 1, 12))
    setTimeout(() => setPhrase(null), 1100)
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const now = performance.now()
      if (now - cooldownRef.current < 250) return
      const dx = e.clientX - pos.x
      const dy = e.clientY - pos.y
      if (Math.hypot(dx, dy) < 110) {
        cooldownRef.current = now
        flee()
      }
    }
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [pos, flee])

  if (!mounted) return null

  return (
    <motion.div
      className="absolute z-20 select-none"
      style={{ left: pos.x, top: pos.y, translateX: "-50%", translateY: "-50%" }}
      animate={{ left: pos.x, top: pos.y, rotate: [0, -3, 3, 0] }}
      transition={{
        left: { type: "spring", stiffness: 700, damping: 22 },
        top: { type: "spring", stiffness: 700, damping: 22 },
        rotate: { duration: 1.6, repeat: Infinity },
      }}
    >
      <div className="relative" onTouchStart={flee}>
        <AnimatePresence>
          {phrase && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border-[3px] border-foreground bg-card px-3 py-1.5 font-display text-lg tracking-wider text-foreground shadow-[4px_4px_0_0_var(--foreground)]"
            >
              {phrase}
              <div className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-foreground bg-card" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative h-36 w-36 overflow-hidden rounded-full border-[5px] border-foreground shadow-[6px_6px_0_0_var(--foreground)]">
          <img src="/charlie.png" alt="Charlie" className="h-full w-full object-cover" draggable={false} />
        </div>

        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border-[3px] border-foreground bg-secondary px-3 py-0.5 font-display text-sm tracking-widest text-foreground">
          CHARLIE
        </div>

        {panicLevel > 0 && (
          <motion.div
            className="absolute -right-2 top-2 h-3 w-2 rounded-full bg-[#5ec8ff] border-2 border-foreground"
            animate={{ y: [0, 14, 14], opacity: [1, 1, 0] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  )
}

// ---------- Pim: draggable + attracted to Alan ----------
function DraggablePim({
  sadZoneRef,
  onExplode,
  physics,
  onEaten,
  eaten,
}: {
  sadZoneRef: React.RefObject<HTMLDivElement | null>
  onExplode: () => void
  physics: PhysicsRefs
  onEaten: (atScreenPos: Vec) => void
  eaten: boolean
}) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (
        physics.alanActiveRef.current &&
        physics.alanPosRef.current &&
        !draggingRef.current &&
        wrapRef.current &&
        !eaten
      ) {
        const r = wrapRef.current.getBoundingClientRect()
        const px = r.left + r.width / 2
        const py = r.top + r.height / 2
        const ax = physics.alanPosRef.current.x
        const ay = physics.alanPosRef.current.y
        const dx = ax - px
        const dy = ay - py
        const dist = Math.hypot(dx, dy) || 1
        if (dist < 70) {
          onEaten({ x: ax, y: ay })
        } else {
          const strength = Math.min(45000 / (dist * dist + 80), 9)
          x.set(x.get() + (dx / dist) * strength)
          y.set(y.get() + (dy / dist) * strength)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [physics, x, y, onEaten, eaten])

  const handleStart = () => { draggingRef.current = true; setDragging(true) }
  const handleEnd = (_: unknown, info: PanInfo) => {
    draggingRef.current = false
    setDragging(false)
    if (!sadZoneRef.current) return
    const r = sadZoneRef.current.getBoundingClientRect()
    const { x: px, y: py } = info.point
    if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) onExplode()
  }

  if (eaten) return null

  return (
    <motion.div
      ref={wrapRef}
      drag
      dragMomentum={false}
      dragElastic={0.2}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
      whileDrag={{ scale: 1.15, zIndex: 50 }}
      style={{ x, y }}
      className="absolute bottom-24 left-12 z-30 cursor-grab touch-none active:cursor-grabbing"
    >
      <motion.div
        className="relative select-none"
        animate={dragging ? { rotate: [0, -8, 8, -8, 8, 0] } : { y: [0, -8, 0] }}
        transition={{
          rotate: { duration: 0.4, repeat: Infinity },
          y: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <AnimatePresence>
          {dragging && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border-[3px] border-foreground bg-secondary px-3 py-1.5 font-display text-lg tracking-wider text-foreground shadow-[4px_4px_0_0_var(--foreground)]"
            >
              WHEEEEE!!
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative h-40 w-40 overflow-hidden rounded-full border-[5px] border-foreground shadow-[6px_6px_0_0_var(--foreground)]">
          <img src="/pim.png" alt="Pim" className="h-full w-full object-cover" draggable={false} />
        </div>

        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border-[3px] border-foreground bg-card px-3 py-0.5 font-display text-sm tracking-widest text-foreground">
          PIM
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---------- Sad Guy Zone (TV portal) ----------
function SadZone({ innerRef }: { innerRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
      <motion.div
        animate={{ rotate: [-1.5, 1.5, -1.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <div className="rounded-[28px] border-[5px] border-foreground bg-card p-5 shadow-[10px_10px_0_0_var(--foreground)]">
          <div
            ref={innerRef}
            className="pointer-events-auto relative h-56 w-72 overflow-hidden rounded-xl border-[5px] border-foreground bg-[repeating-linear-gradient(0deg,#1a1a1a_0px,#1a1a1a_2px,#0a0a0a_2px,#0a0a0a_4px)]"
          >
            <div className="absolute inset-0 opacity-30 mix-blend-screen">
              <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,#fff_1px,transparent_1px),radial-gradient(circle_at_70%_60%,#fff_1px,transparent_1px),radial-gradient(circle_at_40%_80%,#fff_1px,transparent_1px)] [background-size:6px_6px,8px_8px,5px_5px]" />
            </div>

            <div className="relative flex h-full w-full flex-col items-center justify-center text-card">
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="flex flex-col items-center gap-3"
              >
                <div className="relative h-20 w-20 rounded-full border-[4px] border-card bg-transparent">
                  <div className="absolute left-3 top-5 h-3 w-3 rounded-full bg-card" />
                  <div className="absolute right-3 top-5 h-3 w-3 rounded-full bg-card" />
                  <div className="absolute left-1/2 top-3 h-1 w-2 -translate-x-3 rotate-12 rounded bg-card" />
                  <div className="absolute right-1/2 top-3 h-1 w-2 translate-x-3 -rotate-12 rounded bg-card" />
                  <div className="absolute bottom-3 left-1/2 h-3 w-8 -translate-x-1/2 rounded-b-full border-b-[3px] border-card" />
                  <motion.div
                    animate={{ y: [0, 12, 12], opacity: [1, 1, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    className="absolute left-3 top-9 h-2 w-1.5 rounded-full bg-[#5ec8ff]"
                  />
                </div>
                <p className="font-display text-xl tracking-widest text-card">SAD GUY</p>
              </motion.div>
            </div>

            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_3px,rgba(0,0,0,0.25)_3px,rgba(0,0,0,0.25)_4px)]" />
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            <div className="flex gap-1">
              <div className="h-3 w-3 rounded-full border-2 border-foreground bg-secondary" />
              <div className="h-3 w-3 rounded-full border-2 border-foreground bg-accent" />
            </div>
            <div className="font-display text-sm tracking-[0.3em] text-foreground">Help this guy ^</div>
            <div className="h-3 w-10 rounded-full border-2 border-foreground bg-foreground" />
          </div>
        </div>

        <div className="absolute -top-6 left-1/2 -translate-x-1/2 rotate-[-4deg] rounded border-[3px] border-foreground bg-secondary px-3 py-1 font-display text-sm tracking-widest text-foreground shadow-[3px_3px_0_0_var(--foreground)]">
          DRAG PIM HERE
        </div>
      </motion.div>
    </div>
  )
}

// ---------- Happiness Explosion ----------
function HappinessExplosion({ onComplete }: { onComplete: () => void }) {
  const [bg, setBg] = useState("#ff1f8f")

  useEffect(() => {
    const colors = ["#ff1f8f", "#ffe14d", "#7cff3e", "#5ec8ff"]
    let i = 0
    const id = setInterval(() => { i = (i + 1) % colors.length; setBg(colors[i]) }, 110)
    const t = setTimeout(onComplete, 5000)
    return () => { clearInterval(id); clearTimeout(t) }
  }, [onComplete])

  const sparkles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    size: 20 + Math.random() * 40,
    rot: Math.random() * 360,
  }))

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: bg }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          className="absolute"
          style={{ left: `${s.x}%`, width: s.size, height: s.size }}
          initial={{ y: "110vh", rotate: s.rot }}
          animate={{ y: "-20vh", rotate: s.rot + 720 }}
          transition={{ duration: 2.5 + Math.random() * 1.5, delay: s.delay, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <path d="M12 0 L14 9 L24 12 L14 15 L12 24 L10 15 L0 12 L10 9 Z" fill="#fff8e8" stroke="#0a0a0a" strokeWidth="2" />
          </svg>
        </motion.div>
      ))}

      <motion.div
        className="relative z-10 px-8 text-center"
        animate={{ scale: [1, 1.08, 1], rotate: [-2, 2, -2] }}
        transition={{ duration: 0.4, repeat: Infinity }}
      >
        <h1
          className="font-display text-6xl leading-none tracking-wider md:text-8xl lg:text-[10rem]"
          style={{ WebkitTextStroke: "4px #0a0a0a", color: "#fff8e8", textShadow: "8px 8px 0 #0a0a0a" }}
        >
          OH YEAH
          <br />
          PIM
          <br />
          OH YEAH
        </h1>
      </motion.div>
    </motion.div>
  )
}

// ---------- Cheese Clicker (main goal: 20k) ----------
const CHEESE_GOAL = 20000

function CheeseClicker({ count, onClick }: { count: number; onClick: () => void }) {
  const pct = Math.min((count / CHEESE_GOAL) * 100, 100)
  const [pop, setPop] = useState(false)

  const handleClick = () => {
    onClick()
    setPop(true)
    setTimeout(() => setPop(false), 110)
  }

  return (
    <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-2">
      <div className="relative">
        <motion.button
          type="button"
          className="relative cursor-pointer select-none focus:outline-none"
          animate={pop ? { scale: 0.82, rotate: -8 } : { scale: 1, rotate: 0, y: [0, -5, 0] }}
          transition={pop ? { duration: 0.08 } : { y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
          onClick={handleClick}
          whileHover={pop ? {} : { scale: 1.12 }}
        >
          <div className="rounded-2xl border-[4px] border-foreground bg-[#ffe14d] px-5 py-3 shadow-[5px_5px_0_0_var(--foreground)]">
            <span className="text-5xl leading-none select-none">🧀</span>
          </div>
        </motion.button>

        <AnimatePresence>
          {pop && (
            <motion.div
              key={count}
              initial={{ opacity: 1, y: -4, scale: 1 }}
              animate={{ opacity: 0, y: -40, scale: 0.7 }}
              exit={{}}
              transition={{ duration: 0.5 }}
              className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 font-display text-sm tracking-wider text-foreground"
            >
              +1 🧀
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-44 rounded-lg border-[3px] border-foreground bg-card px-3 py-2 shadow-[3px_3px_0_0_var(--foreground)]">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] text-foreground">
          <span>{count.toLocaleString()} 🧀</span>
          <span className="opacity-50">/ 20K</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full border-2 border-foreground bg-background">
          <motion.div
            className="h-full rounded-full bg-[#ffe14d]"
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 14 }}
          />
        </div>
        {pct >= 100 && (
          <div className="mt-1 text-center font-display text-[10px] tracking-widest text-foreground">
            COMPLETE!!
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Glep's iPad feed content ----------
const IPAD_FEED = [
  {
    app: "NOTIFICATIONS",
    color: "#5ec8ff",
    icon: "🔔",
    title: "THE VOID liked your post",
    body: '"good morning" — 3 seconds ago',
  },
  {
    app: "MESSAGES — ALAN",
    color: "#7cff3e",
    icon: "💬",
    title: "iMessage",
    body: "Alan: did u fill out the tps reports\nGlep: what\nAlan: ok\nAlan: also did u fill out the tps reports\nAlan: glep",
  },
  {
    app: "GLEP TV",
    color: "#ff1f8f",
    icon: "▶",
    title: "SUBSCRIBE OR ELSE (10 HOURS)",
    body: "0 views · uploaded 4 years ago · GLEP OFFICIAL",
  },
  {
    app: "EMAIL",
    color: "#ffe14d",
    icon: "📧",
    title: "Re: Your Behavior — HR@company.void",
    body: "Please stop ascending to a higher plane during work hours. This is your 4th warning this week.",
  },
  {
    app: "REDDIT",
    color: "#ff1f8f",
    icon: "👽",
    title: "AITA for existing? [UPDATE: I am still existing]",
    body: "r/AmITheAsshole · 2.4M upvotes\nTop comment: \"NTA, your roommate sounds like Alan\"",
  },
  {
    app: "DOORDASH",
    color: "#7cff3e",
    icon: "🛵",
    title: "Your order is on the way!",
    body: "1x Existential Dread (Large)\n1x Side of Cheese\nETA: ∞ minutes",
  },
  {
    app: "NOTES",
    color: "#5ec8ff",
    icon: "📝",
    title: "things 2 do today",
    body: "• subscribe\n• SUBSCRIBE\n• remind everyone to subscribe\n• ascend briefly\n• subscribe again",
  },
  {
    app: "GLEP TV",
    color: "#ff1f8f",
    icon: "▶",
    title: "HOW TO BE MORE LIKE GLEP (GONE WRONG) (EMOTIONAL)",
    body: "14.2M views · GLEP OFFICIAL · #subscribe #void #ipad",
  },
  {
    app: "SPOTIFY",
    color: "#7cff3e",
    icon: "🎵",
    title: "Now Playing",
    body: "silence (extended edition) — THE VOID\n∞:∞ ━━━━━●──────── ∞:∞",
  },
  {
    app: "CAMERA ROLL",
    color: "#ffe14d",
    icon: "📷",
    title: "Photo — just now",
    body: "[image: a perfectly normal room. nothing is wrong here. nothing is wrong. please do not look closer.]",
  },
]

// ---------- Glep's iPad modal ----------
function GlepIpad({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />

      <motion.div
        className="relative z-10"
        initial={{ scale: 0.78, rotate: -10, y: 24 }}
        animate={{ scale: 1, rotate: 0, y: 0 }}
        exit={{ scale: 0.78, rotate: 10, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Label */}
        <div className="mb-3 text-center">
          <span className="rounded-md border-[3px] border-foreground bg-accent px-3 py-1 font-display text-sm tracking-widest text-foreground shadow-[3px_3px_0_0_var(--foreground)]">
            GLEP&apos;S iPAD
          </span>
        </div>

        {/* iPad shell */}
        <div
          className="relative rounded-[32px] border-[7px] border-foreground bg-foreground shadow-[12px_12px_0_0_rgba(0,0,0,0.4)]"
          style={{ width: 320 }}
        >
          {/* Camera notch */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-2 w-10 rounded-full bg-card/20" />
          </div>

          {/* Screen */}
          <div className="mx-1 overflow-hidden rounded-[22px] bg-[#0d0d0d]" style={{ height: 500 }}>
            {/* Status bar */}
            <div className="flex items-center justify-between bg-[#111] px-4 py-1.5">
              <span className="font-mono text-[10px] text-white/50">9:41</span>
              <span className="font-display text-[10px] tracking-[0.2em] text-white/70">GLEP OS 1.0</span>
              <span className="font-mono text-[10px] text-white/50">🔋 69%</span>
            </div>

            {/* Scrollable feed */}
            <div className="h-[calc(500px-32px)] overflow-y-auto px-2.5 py-2 space-y-2">
              {IPAD_FEED.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.055 }}
                  className="overflow-hidden rounded-xl"
                  style={{ backgroundColor: item.color + "16", border: `1px solid ${item.color}30` }}
                >
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1"
                    style={{ backgroundColor: item.color + "35" }}
                  >
                    <span className="text-xs leading-none">{item.icon}</span>
                    <span className="font-display text-[9px] tracking-widest text-white/80">{item.app}</span>
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="font-display text-[11px] leading-snug tracking-wide text-white">{item.title}</p>
                    <p className="mt-1 whitespace-pre-line font-mono text-[9px] leading-relaxed text-white/55">{item.body}</p>
                  </div>
                </motion.div>
              ))}

              <div className="py-3 text-center font-display text-[9px] tracking-widest text-white/20">
                — YOU HAVE REACHED THE BOTTOM OF THE VOID —
              </div>
            </div>
          </div>

          {/* Home bar */}
          <div className="flex justify-center py-2">
            <div className="h-1 w-16 rounded-full bg-card/25" />
          </div>
        </div>

        <p className="mt-3 text-center font-mono text-[10px] tracking-widest text-foreground/50">
          tap anywhere to close
        </p>
      </motion.div>
    </motion.div>
  )
}

// ---------- Glep: tap to see iPad ----------
function Glep({ physics, onOpen }: { physics: PhysicsRefs; onOpen: () => void }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const MAX_OFFSET = 280
    const tick = () => {
      if (physics.alanActiveRef.current && physics.alanPosRef.current && wrapRef.current) {
        const r = wrapRef.current.getBoundingClientRect()
        const px = r.left + r.width / 2
        const py = r.top + r.height / 2
        const ax = physics.alanPosRef.current.x
        const ay = physics.alanPosRef.current.y
        const dx = ax - px
        const dy = ay - py
        const dist = Math.hypot(dx, dy) || 1
        const strength = Math.min(22000 / (dist * dist + 100), 5)
        const nx = x.get() + (dx / dist) * strength
        const ny = y.get() + (dy / dist) * strength
        x.set(Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, nx)))
        y.set(Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, ny)))
      } else {
        const cx = x.get()
        const cy = y.get()
        if (Math.abs(cx) > 0.5 || Math.abs(cy) > 0.5) {
          x.set(cx * 0.94)
          y.set(cy * 0.94)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [physics, x, y])

  return (
    <motion.div
      ref={wrapRef}
      className="absolute bottom-12 right-12 z-20"
      style={{ x, y }}
    >
      <motion.button
        type="button"
        className="cursor-pointer select-none focus:outline-none"
        whileHover={{ scale: 1.08, rotate: -4 }}
        whileTap={{ scale: 0.92, rotate: 4 }}
        onClick={onOpen}
        animate={{ y: [0, -6, 0] }}
        transition={{ y: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
      >
        <div className="relative">
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-[5px] border-foreground shadow-[6px_6px_0_0_var(--foreground)]">
            <img src="/glep.png" alt="Glep" className="h-full w-full object-cover" draggable={false} />
          </div>

          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border-[3px] border-foreground bg-accent px-3 py-0.5 font-display text-sm tracking-widest text-foreground">
            GLEP
          </div>

          <motion.div
            animate={{ rotate: [-6, 6, -6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute -right-7 -top-5 rounded-md border-[3px] border-foreground bg-card px-2 py-1 font-display text-xs tracking-wider text-foreground shadow-[3px_3px_0_0_var(--foreground)]"
          >
            📱 TAP
          </motion.div>
        </div>
      </motion.button>
    </motion.div>
  )
}

// ---------- Alan ----------
function Alan({ pos, active }: { pos: Vec; active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none fixed z-[60] select-none"
          style={{ left: pos.x, top: pos.y, translateX: "-50%", translateY: "-50%" }}
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: [-1.5, 1.5, -1.5] }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            scale: { type: "spring", stiffness: 300, damping: 20 },
            rotate: { duration: 2.5, repeat: Infinity },
          }}
        >
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border-[3px] border-foreground bg-card px-3 py-1.5 font-display text-sm tracking-wider text-foreground shadow-[4px_4px_0_0_var(--foreground)]"
            >
              TPS REPORT?
              <div className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-foreground bg-card" />
            </motion.div>

            <div className="relative h-24 w-24 overflow-hidden rounded-full border-[5px] border-foreground shadow-[6px_6px_0_0_var(--foreground)]">
              <img src="/alan.png" alt="Alan" className="h-full w-full object-cover" draggable={false} />
            </div>

            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border-[3px] border-foreground bg-card px-3 py-0.5 font-display text-sm tracking-widest text-foreground">
              ALAN
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------- Cheese bubble (Pim eulogy) ----------
function CheeseBubble({ pos, onDone }: { pos: Vec; onDone: () => void }) {
  const phrases = [
    "BUT MY CHEESE...", "WHERE'S THE CHEESE??", "i had cheese for him",
    "GOODBYE CHEESE FRIEND", "the cheese was for sharing.",
  ]
  const phrase = useRef(phrases[Math.floor(Math.random() * phrases.length)]).current

  useEffect(() => {
    const t = setTimeout(onDone, 2600)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      className="pointer-events-none fixed z-[80] select-none"
      style={{ left: pos.x, top: pos.y, translateX: "-50%", translateY: "-50%" }}
      initial={{ scale: 0, y: 20, opacity: 0 }}
      animate={{ scale: 1, y: -120, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2.4, ease: "easeOut" }}
    >
      <div className="rounded-md border-[3px] border-foreground bg-secondary px-4 py-2 font-display text-2xl tracking-wider text-foreground shadow-[5px_5px_0_0_var(--foreground)]">
        {phrase}
      </div>
    </motion.div>
  )
}

// ---------- Decorations ----------
function VoidDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(circle, #0a0a0a 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px",
        }}
      />
      {[
        { top: "12%", left: "8%", size: 28, rot: 12 },
        { top: "22%", right: "14%", size: 36, rot: -20 },
        { top: "55%", left: "6%", size: 22, rot: 30 },
        { bottom: "18%", right: "30%", size: 30, rot: -10 },
        { top: "38%", right: "8%", size: 26, rot: 18 },
        { bottom: "8%", left: "38%", size: 24, rot: -25 },
      ].map((s, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute"
          style={{ top: (s as any).top, left: (s as any).left, right: (s as any).right, bottom: (s as any).bottom, width: s.size, height: s.size }}
          animate={{ rotate: [s.rot, s.rot + 360] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "linear" }}
        >
          <path d="M12 0 L14 9 L24 12 L14 15 L12 24 L10 15 L0 12 L10 9 Z" fill="#ffe14d" stroke="#0a0a0a" strokeWidth="1.8" />
        </motion.svg>
      ))}
      <svg className="absolute left-[20%] top-[18%] h-10 w-24" viewBox="0 0 100 40">
        <path d="M2 20 Q 15 2, 28 20 T 54 20 T 80 20 T 98 20" stroke="#0a0a0a" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <svg className="absolute right-[16%] bottom-[28%] h-10 w-24 rotate-12" viewBox="0 0 100 40">
        <path d="M2 20 Q 15 38, 28 20 T 54 20 T 80 20 T 98 20" stroke="#0a0a0a" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// ---------- Instructions modal ----------
function InstructionsModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <motion.div
        className="relative z-10 mx-4 w-full max-w-sm rotate-[-1deg] rounded-lg border-[4px] border-foreground bg-card p-6 shadow-[8px_8px_0_0_var(--foreground)]"
        initial={{ scale: 0.88, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.88, y: 16 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border-[2px] border-foreground bg-background font-display text-sm text-foreground hover:bg-secondary transition-colors"
        >
          ✕
        </button>

        <p className="font-display text-2xl tracking-wider text-foreground">HOW TO PLAY</p>

        <ol className="mt-3 space-y-3 font-mono text-[12px] leading-relaxed text-foreground">
          <li className="flex gap-3">
            <span className="font-display text-base leading-none text-foreground shrink-0">1.</span>
            <span>Try to touch <b>Charlie</b>. He flees whenever you get close.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-display text-base leading-none text-foreground shrink-0">2.</span>
            <span>Drag <b>Pim</b> into the TV to visit the Sad Guy.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-display text-base leading-none text-foreground shrink-0">3.</span>
            <span>Click the 🧀 <b>cheese</b> at the bottom 20,000 times to win!</span>
          </li>
          <li className="flex gap-3">
            <span className="font-display text-base leading-none text-foreground shrink-0">4.</span>
            <span>Tap <b>Glep</b> (📱 TAP) to check what&apos;s on his iPad.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-display text-base leading-none text-foreground shrink-0">5.</span>
            <span><b>Alan</b> drops by with TPS reports. Keep Pim away!</span>
          </li>
        </ol>

        <div className="mt-4 rounded border-[2px] border-foreground bg-secondary px-3 py-1.5 text-center font-mono text-[10px] tracking-widest text-foreground">
          CLICK ANYWHERE TO CLOSE
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---------- Main ----------
export default function SmilingFriendsSandbox() {
  const [explode, setExplode] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showIpad, setShowIpad] = useState(false)
  const sadZoneRef = useRef<HTMLDivElement>(null)

  const [cheeseClicks, setCheeseClicks] = useState(0)

  const [alanPos, setAlanPos] = useState<Vec>({ x: 0, y: 0 })
  const [alanActive, setAlanActive] = useState(false)
  const alanPosRef = useRef<Vec | null>(null)
  const alanActiveRef = useRef(false)

  const [pimEaten, setPimEaten] = useState(false)
  const [cheesePos, setCheesePos] = useState<Vec | null>(null)

  const physics: PhysicsRefs = { alanPosRef, alanActiveRef }

  // 20k cheese clicks = victory
  useEffect(() => {
    if (cheeseClicks === CHEESE_GOAL) setExplode(true)
  }, [cheeseClicks])

  // Alan: spawns every 60s, visible for 3s
  useEffect(() => {
    const spawn = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const margin = 130
      const edge = Math.floor(Math.random() * 4)
      let x = 0, y = 0
      if (edge === 0) { x = Math.random() * (w - margin * 2) + margin; y = margin }
      else if (edge === 1) { x = w - margin; y = Math.random() * (h - margin * 2) + margin }
      else if (edge === 2) { x = Math.random() * (w - margin * 2) + margin; y = h - margin }
      else { x = margin; y = Math.random() * (h - margin * 2) + margin }

      const next = { x, y }
      setAlanPos(next)
      alanPosRef.current = next
      setAlanActive(true)
      alanActiveRef.current = true
      window.setTimeout(() => {
        setAlanActive(false)
        alanActiveRef.current = false
        alanPosRef.current = null
      }, 3000)
    }

    const initial = window.setTimeout(spawn, 20000)
    const id = window.setInterval(spawn, 60000)
    return () => { window.clearTimeout(initial); window.clearInterval(id) }
  }, [])

  const handlePimEaten = useCallback((at: Vec) => {
    setPimEaten(true)
    setCheesePos(at)
  }, [])

  useEffect(() => {
    if (!pimEaten) return
    const t = setTimeout(() => setPimEaten(false), 6000)
    return () => clearTimeout(t)
  }, [pimEaten])

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <VoidDecorations />

      {/* Header */}
      <header className="absolute left-1/2 top-6 z-30 -translate-x-1/2 select-none text-center">
        <motion.h1
          className="font-display text-5xl leading-none tracking-wider text-foreground md:text-7xl"
          style={{ WebkitTextStroke: "1px #0a0a0a", textShadow: "5px 5px 0 #fff8e8, 7px 7px 0 #0a0a0a" }}
          animate={{ rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          SMILING FRIENDS
        </motion.h1>
        <div className="mt-2 inline-block rotate-[-2deg] rounded border-[3px] border-foreground bg-card px-3 py-1 font-mono text-xs uppercase tracking-widest text-foreground shadow-[3px_3px_0_0_var(--foreground)]">
          Smiling Friends game / made by luke
        </div>
      </header>

      {/* ? button — top right */}
      <motion.button
        onClick={() => setShowInstructions(true)}
        className="absolute right-6 top-6 z-30 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-foreground bg-card font-display text-xl text-foreground shadow-[3px_3px_0_0_var(--foreground)]"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
      >
        ?
      </motion.button>

      <SadZone innerRef={sadZoneRef} />
      <CursorAverseCharlie />
      <DraggablePim
        sadZoneRef={sadZoneRef}
        onExplode={() => setExplode(true)}
        physics={physics}
        onEaten={handlePimEaten}
        eaten={pimEaten}
      />
      <CheeseClicker
        count={cheeseClicks}
        onClick={() => setCheeseClicks((c) => Math.min(c + 1, CHEESE_GOAL))}
      />
      <Glep physics={physics} onOpen={() => setShowIpad(true)} />

      {/* Alan + cheese bubble sit outside the scene */}
      <Alan pos={alanPos} active={alanActive} />

      <AnimatePresence>
        {cheesePos && (
          <CheeseBubble pos={cheesePos} onDone={() => setCheesePos(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIpad && <GlepIpad onClose={() => setShowIpad(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {explode && <HappinessExplosion onComplete={() => setExplode(false)} />}
      </AnimatePresence>
    </main>
  )
}
