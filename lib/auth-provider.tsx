"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { auth } from "@/lib/firebase"
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  type Auth
} from "firebase/auth"

type AuthContextType = {
  user: User | null
  session: User | null
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
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setIsLoading(false)
    })

    return () => {
      unsubscribe()
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
    await firebaseSignOut(auth)
    router.push("/admin/login")
  }

  return <AuthContext.Provider value={{ user, session: user, isLoading, signOut }}>{children}</AuthContext.Provider>
}

