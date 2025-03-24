"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Session, User } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const getSession = async () => {
      setIsLoading(true)
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error("Error getting session:", error)
      }

      setSession(data.session)
      setUser(data.session?.user || null)
      setIsLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user || null)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 管理者ページへのアクセス制御
  useEffect(() => {
    if (!isLoading) {
      // /admin/login以外の/admin/*パスで未認証の場合はログインページにリダイレクト
      if (pathname?.startsWith("/admin") && pathname !== "/admin/login" && !user) {
        router.push("/admin/login")
      }

      // ログイン済みでログインページにアクセスした場合はダッシュボードにリダイレクト
      if (pathname === "/admin/login" && user) {
        router.push("/admin/dashboard")
      }
    }
  }, [user, isLoading, pathname, router])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  return <AuthContext.Provider value={{ user, session, isLoading, signOut }}>{children}</AuthContext.Provider>
}

