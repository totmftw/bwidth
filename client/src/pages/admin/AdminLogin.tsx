import { useState, useEffect, FormEvent } from "react";
import { useLocation, Redirect } from "wouter";
import { motion } from "framer-motion";
import { Loader2, ShieldAlert } from "lucide-react";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

function isAdminRole(role: string): boolean {
  return role === "admin" || role === "platform_admin";
}

export default function AdminLogin() {
  const { user, isLoading, logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated as admin, redirect immediately
  const authenticatedRole = (user?.metadata as Record<string, string> | null)?.role ?? "";
  if (!isLoading && user && isAdminRole(authenticatedRole)) {
    return <Redirect to="/admin/dashboard" />;
  }

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { message?: string }).message || "Invalid credentials");
        return;
      }

      const responseUser = await res.json();
      const role: string = responseUser?.metadata?.role ?? "";

      if (!isAdminRole(role)) {
        setError("This account does not have admin access.");
        // Log them out so the session is not left open
        await fetch("/api/logout", { method: "POST", credentials: "include" });
        return;
      }

      // Full-page navigation so query cache re-initialises cleanly
      window.location.href = "/admin/dashboard";
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Authenticated but not admin
  if (user && !isAdminRole(authenticatedRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="glass-card w-full max-w-sm text-center">
            <CardHeader className="pb-2">
              <ShieldAlert className="mx-auto w-10 h-10 text-destructive mb-2" />
              <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your account does not have admin privileges.
              </p>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Log Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">
            BANDWIDTH
          </h1>
          <p className="text-sm text-muted-foreground mt-1 tracking-widest uppercase">
            Admin Control Panel
          </p>
        </div>

        <Card className="glass-card">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              Sign in to Admin
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive text-center"
                >
                  {error}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !username || !password}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Restricted area — authorised personnel only
        </p>
      </motion.div>
    </div>
  );
}
