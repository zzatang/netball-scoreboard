"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Play, Pause, RotateCcw, Plus, Minus, Edit3, Volume2 } from "lucide-react"

export default function NetballScoreboard() {
  // Score state
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [homeTeam, setHomeTeam] = useState("Our Team")
  const [awayTeam, setAwayTeam] = useState("Other Team")

  // Timer state
  const [timeLeft, setTimeLeft] = useState(15 * 60) // 15 minutes in seconds
  const [isRunning, setIsRunning] = useState(false)
  const [quarter, setQuarter] = useState(1)
  const [endTime, setEndTime] = useState<number | null>(null)
  
  // Sound and alerts
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Edit mode state
  const [editingHome, setEditingHome] = useState(false)
  const [editingAway, setEditingAway] = useState(false)
  const [editingHomeTeam, setEditingHomeTeam] = useState(false)
  const [editingAwayTeam, setEditingAwayTeam] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load game state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('netball-scoreboard')
    if (savedState) {
      try {
        const state = JSON.parse(savedState)
        setHomeScore(state.homeScore || 0)
        setAwayScore(state.awayScore || 0)
        setHomeTeam(state.homeTeam || "Our Team")
        setAwayTeam(state.awayTeam || "Other Team")
        setQuarter(state.quarter || 1)
        // Restore running timer based on endTime so it stays accurate across reloads/backgrounding
        if (typeof state.endTime === 'number' && state.endTime > 0) {
          setEndTime(state.endTime)
          const remaining = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000))
          setTimeLeft(remaining || 0)
          // Only keep running if there is time remaining
          setIsRunning(Boolean(state.isRunning && remaining > 0))
        } else {
          setTimeLeft(state.timeLeft || 15 * 60)
          setIsRunning(false)
        }
        setSoundEnabled(state.soundEnabled ?? true)
      } catch (error) {
        console.error('Failed to load saved game state:', error)
      }
    }
  }, [])

  // Save game state to localStorage whenever state changes
  useEffect(() => {
    const gameState = {
      homeScore,
      awayScore,
      homeTeam,
      awayTeam,
      quarter,
      timeLeft,
      soundEnabled,
      isRunning,
      endTime
    }
    localStorage.setItem('netball-scoreboard', JSON.stringify(gameState))
  }, [homeScore, awayScore, homeTeam, awayTeam, quarter, timeLeft, soundEnabled, isRunning, endTime])

  // Play sound alert
  const playAlert = () => {
    if (soundEnabled) {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    }
  }

  // Timer effect based on wall-clock endTime to survive background/lock
  useEffect(() => {
    if (!isRunning || !endTime) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        setIsRunning(false)
        setEndTime(null)
        playAlert()
      }
    }

    updateRemaining()
    intervalRef.current = setInterval(updateRemaining, 250)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, endTime])

  // Recalculate immediately on visibility/focus changes
  useEffect(() => {
    const recalc = () => {
      if (!endTime) return
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        setIsRunning(false)
        setEndTime(null)
      }
    }
    window.addEventListener('visibilitychange', recalc)
    window.addEventListener('focus', recalc)
    return () => {
      window.removeEventListener('visibilitychange', recalc)
      window.removeEventListener('focus', recalc)
    }
  }, [endTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const resetTimer = () => {
    setIsRunning(false)
    setEndTime(null)
    setTimeLeft(15 * 60)
  }

  const nextQuarter = () => {
    if (quarter < 4) {
      setQuarter((prev) => prev + 1)
      resetTimer()
    }
  }

  const resetQuarter = () => {
    setQuarter(1)
    resetTimer()
  }

  const handleScoreEdit = (team: "home" | "away", value: string) => {
    const score = Number.parseInt(value) || 0
    if (team === "home") {
      setHomeScore(Math.max(0, score))
    } else {
      setAwayScore(Math.max(0, score))
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-md mx-auto">
      <div className="space-y-5 flex flex-col">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Netball Scoreboard</h1>
          <div className="flex items-center justify-center gap-4 mb-2">
            <Button
              onClick={resetQuarter}
              variant="outline"
              size="sm"
              className="px-2 py-1 text-slate-700"
            >
              Reset Quarter
            </Button>
            <div className="text-lg font-semibold text-slate-700">Quarter {quarter}</div>
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant="ghost"
              size="sm"
              className="p-1"
              title={soundEnabled ? "Sound On" : "Sound Off"}
            >
              <Volume2 className={`w-4 h-4 ${soundEnabled ? 'text-slate-700' : 'text-slate-300'}`} />
            </Button>
          </div>
          <Progress value={(quarter / 4) * 100} className="w-full max-w-xs mx-auto h-2" />
        </div>

        {/* Timer */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-3">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">{formatTime(timeLeft)}</div>
              <div className="flex justify-center gap-2 mb-2">
                <Button
                  onClick={() => {
                    if (isRunning) {
                      // Pause: freeze remaining time and clear endTime
                      const remaining = endTime ? Math.max(0, Math.ceil((endTime - Date.now()) / 1000)) : timeLeft
                      setTimeLeft(remaining)
                      setIsRunning(false)
                      setEndTime(null)
                    } else {
                      // Start/resume: set new endTime based on remaining time
                      setEndTime(Date.now() + timeLeft * 1000)
                      setIsRunning(true)
                    }
                  }}
                  variant={isRunning ? "secondary" : "default"}
                  size="sm"
                  className="flex items-center gap-2 bg-white text-slate-800 hover:bg-slate-100"
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isRunning ? "Pause" : "Start"}
                </Button>
                <Button
                  onClick={resetTimer}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-white text-white hover:bg-white hover:text-slate-800 bg-transparent"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </div>
              {quarter < 4 && timeLeft === 0 && (
                <Button onClick={nextQuarter} className="w-full bg-white text-slate-800 hover:bg-slate-100">
                  Next Quarter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scoreboard */}
        <div className="space-y-4">
          {/* Away Team */}
          <Card className="bg-rose-100 border-rose-200">
            <CardHeader className="pb-0">
              <CardTitle className="text-center text-2xl font-bold">
                {editingAwayTeam ? (
                  <Input
                    value={awayTeam}
                    onChange={(e) => setAwayTeam(e.target.value)}
                    onBlur={() => setEditingAwayTeam(false)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingAwayTeam(false)}
                    className="text-center text-sm"
                    autoFocus
                  />
                ) : (
                  <div
                    className="flex items-center justify-center gap-1 cursor-pointer text-slate-700"
                    onClick={() => setEditingAwayTeam(true)}
                  >
                    {awayTeam}
                    <Edit3 className="w-3 h-3 opacity-50" />
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-1">
              <div className="text-center">
                {editingAway ? (
                  <Input
                    type="number"
                    value={awayScore}
                    onChange={(e) => handleScoreEdit("away", e.target.value)}
                    onBlur={() => setEditingAway(false)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingAway(false)}
                    className="text-6xl font-bold text-center mb-2"
                    autoFocus
                  />
                ) : (
                  <div className="-mt-1 mb-0 flex items-center justify-center gap-3">
                    <Button
                      onClick={() => setAwayScore((prev) => Math.max(0, prev - 1))}
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 px-4 py-1 rounded-md"
                      aria-label="Decrease away score"
                      title="Decrease"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <div
                      className="text-6xl font-bold text-slate-800 cursor-pointer flex items-center justify-center gap-2"
                      onClick={() => setEditingAway(true)}
                    >
                      {awayScore}
                      <Edit3 className="w-4 h-4 opacity-50" />
                    </div>
                  </div>
                )}
                <div className="flex justify-center">
                  <Button
                    onClick={() => setAwayScore((prev) => prev + 1)}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg w-3/4 max-w-[320px]"
                    aria-label="Increase away score"
                    title="Increase"
                  >
                    <Plus className="w-7 h-7" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Home Team */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-0">
              <CardTitle className="text-center text-2xl font-bold">
                {editingHomeTeam ? (
                  <Input
                    value={homeTeam}
                    onChange={(e) => setHomeTeam(e.target.value)}
                    onBlur={() => setEditingHomeTeam(false)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingHomeTeam(false)}
                    className="text-center text-sm"
                    autoFocus
                  />
                ) : (
                  <div
                    className="flex items-center justify-center gap-1 cursor-pointer text-slate-700"
                    onClick={() => setEditingHomeTeam(true)}
                  >
                    {homeTeam}
                    <Edit3 className="w-3 h-3 opacity-50" />
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-1">
              <div className="text-center">
                {editingHome ? (
                  <Input
                    type="number"
                    value={homeScore}
                    onChange={(e) => handleScoreEdit("home", e.target.value)}
                    onBlur={() => setEditingHome(false)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingHome(false)}
                    className="text-6xl font-bold text-center mb-2"
                    autoFocus
                  />
                ) : (
                  <div className="-mt-1 mb-0 flex items-center justify-center gap-3">
                    <Button
                      onClick={() => setHomeScore((prev) => Math.max(0, prev - 1))}
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 px-4 py-1 rounded-md"
                      aria-label="Decrease home score"
                      title="Decrease"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <div
                      className="text-6xl font-bold text-slate-800 cursor-pointer flex items-center justify-center gap-2"
                      onClick={() => setEditingHome(true)}
                    >
                      {homeScore}
                      <Edit3 className="w-4 h-4 opacity-50" />
                    </div>
                  </div>
                )}
                <div className="flex justify-center">
                  <Button
                    onClick={() => setHomeScore((prev) => prev + 1)}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg w-3/4 max-w-[320px]"
                    aria-label="Increase home score"
                    title="Increase"
                  >
                    <Plus className="w-7 h-7" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
