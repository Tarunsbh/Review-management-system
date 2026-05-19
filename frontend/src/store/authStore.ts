"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";
import { User, AuthState } from "@/types";

interface AuthStore extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: (token: string, user: User) => {
        Cookies.set("auth_token", token, { expires: 7, secure: true });
        set({ token, user, isAuthenticated: true, isLoading: false });
      },

      logout: () => {
        Cookies.remove("auth_token");
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user: User) => set({ user }),

      setLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      name: "eglobe-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
