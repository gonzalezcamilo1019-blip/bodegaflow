import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useGetMe, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  areaId: number | null;
  areaName: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);

  const { data, isLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  useEffect(() => {
    if (data) {
      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        areaId: data.areaId ?? null,
        areaName: data.areaName ?? null,
      });
    } else if (isError) {
      setUser(null);
    }
  }, [data, isError]);

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        setUser(null);
        queryClient.clear();
      },
    },
  });

  function logout() {
    logoutMutation.mutate();
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
