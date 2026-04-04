import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, insertArtistSchema, insertOrganizerSchema, insertVenueSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, User as UserIcon } from "lucide-react";

// Schemas for the forms
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Extend registration schema based on role selection
const registerBaseSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();

  // Extract query params manually since wouter doesn't provide them nicely in hook
  const searchParams = new URLSearchParams(window.location.search);
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  const initialRole = searchParams.get("role") || "artist";

  const [mode, setMode] = useState<"login" | "register">(initialMode);

  if (user) {
    const roleLabelMap: Record<string, string> = {
      artist: "Artist",
      organizer: "Organizer",
      venue_manager: "Venue Manager",
      venue: "Venue Manager",
      admin: "Admin",
      platform_admin: "Platform Admin",
      curator: "Curator",
    };
    const roleLabel = roleLabelMap[user.role || ""] || user.role || "User";
    const dashboardPath =
      user.role === "artist" ? "/dashboard" :
      (user.role === "admin" || user.role === "platform_admin") ? "/admin" :
      "/dashboard";
    const initials = (user.name || user.username || "U").charAt(0).toUpperCase();

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[128px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[128px]" />

        <Card className="w-full max-w-lg glass-card border-white/10 relative z-10">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-2xl font-bold text-primary">
                {initials}
              </div>
            </div>
            <CardTitle className="text-3xl font-display font-bold">Already signed in</CardTitle>
            <CardDescription className="flex flex-col items-center gap-2 mt-1">
              <span>You are logged in as <strong>{user.name || user.username}</strong></span>
              <Badge variant="secondary" className="capitalize">{roleLabel}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button className="w-full bg-primary" onClick={() => setLocation(dashboardPath)}>
              Go to {roleLabel} Dashboard
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
              {logoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[128px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[128px]" />

      <Card className="w-full max-w-lg glass-card border-white/10 relative z-10">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-display font-bold">
            {mode === "login" ? "Welcome Back" : "Join Bandwidth"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Enter your credentials to access your dashboard"
              : "Create an account to start your journey"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/50">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm initialRole={initialRole} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginForm() {
  const [, setLocation] = useLocation();
  const { loginMutation } = useAuth();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data, {
      onSuccess: () => setLocation("/dashboard"),
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Username</Label>
        <Input {...form.register("username")} autoComplete="username" className="bg-background/50" />
        {form.formState.errors.username && (
          <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <Input type="password" {...form.register("password")} autoComplete="current-password" className="bg-background/50" />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full bg-primary" disabled={loginMutation.isPending}>
        {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>
    </form>
  );
}

function RegisterForm({ initialRole }: { initialRole: string }) {
  const [, setLocation] = useLocation();
  const { registerMutation } = useAuth();
  const [role, setRole] = useState(initialRole);

  // --- Username availability state ---
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Combine base user schema with role-specific schema
  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      email: "",
      phone: "",
      role: role as "artist" | "organizer" | "venue",
      // Flattened role data fields
      bio: "",
      genre: "",
      feeMin: 0,
      feeMax: 0,
      organizationName: "",
      website: "",
      address: "",
      capacity: 0,
    }
  });

  // --- Debounced username availability check ---
  const watchedUsername = form.watch("username");

  useEffect(() => {
    if (usernameTimerRef.current) {
      clearTimeout(usernameTimerRef.current);
    }

    const trimmed = watchedUsername?.trim();
    if (!trimmed || trimmed.length < 2) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    usernameTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);

    return () => {
      if (usernameTimerRef.current) {
        clearTimeout(usernameTimerRef.current);
      }
    };
  }, [watchedUsername]);

  // --- Role switch: preserve common fields ---
  const handleRoleSwitch = useCallback((newRole: string) => {
    const currentValues = form.getValues();
    setRole(newRole);
    // Re-set common fields after role switch so React Hook Form state is not lost
    setTimeout(() => {
      form.setValue("name", currentValues.name);
      form.setValue("username", currentValues.username);
      form.setValue("email", currentValues.email);
      form.setValue("password", currentValues.password);
      form.setValue("confirmPassword", currentValues.confirmPassword);
      form.setValue("phone", currentValues.phone);
    }, 0);
  }, [form]);

  const onSubmit = (data: any) => {
    // Transform flat form data into nested structure expected by API
    const { confirmPassword, ...baseData } = data;
    const payload: any = {
      ...baseData,
      role: role,
    };

    // Ensure roleData has the required 'name' field from the database schema
    if (role === "artist") {
      payload.roleData = {
        name: data.name, // Required by artists table
        bio: data.bio,
        metadata: {
          primaryGenre: data.genre,
          feeMin: Number(data.feeMin),
          feeMax: Number(data.feeMax),
        }
      };
      // Map legacy fields to top-level if needed, but schema prefers priceFrom/priceTo
      payload.roleData.priceFrom = String(data.feeMin);
      payload.roleData.priceTo = String(data.feeMax);
    } else if (role === "organizer") {
      payload.roleData = {
        name: data.organizationName, // Map to top-level 'name' column
        metadata: {
          website: data.website,
        }
      };
    } else if (role === "venue") {
      payload.role = "venue_manager"; // Map to correct DB enum
      payload.roleData = {
        name: data.organizationName,
        address: { full: data.address }, // jsonb column
        capacity: Number(data.capacity), // integer column
        metadata: {}
      };
    }


    registerMutation.mutate(payload, {
      onSuccess: () => {
        // Redirect directly to role-specific setup to avoid PrivateRoute bounce
        if (role === "artist") setLocation("/profile/setup");
        else if (role === "organizer") setLocation("/organizer/setup");
        else setLocation("/venue/setup");
      },
    });
  };


  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
      <div className="space-y-2">
        <Label className="text-sm font-medium">I am a...</Label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: "artist", icon: "🎸", title: "Artist", desc: "Perform & earn" },
            { value: "organizer", icon: "🎪", title: "Organizer", desc: "Book talent" },
            { value: "venue", icon: "🏛️", title: "Venue", desc: "List your space" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleRoleSwitch(opt.value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                role === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-white/10 bg-background/40 text-muted-foreground hover:border-white/30"
              }`}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-xs font-semibold">{opt.title}</span>
              <span className="text-[10px] opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input {...form.register("name")} required className="bg-background/50" />
        </div>
        <div className="space-y-2">
          <Label>Username</Label>
          <div className="relative">
            <Input {...form.register("username")} required className="bg-background/50 pr-8" />
            {usernameStatus === "checking" && (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {usernameStatus === "available" && (
              <CheckCircle2 className="absolute right-2.5 top-2.5 h-4 w-4 text-green-500" />
            )}
            {usernameStatus === "taken" && (
              <XCircle className="absolute right-2.5 top-2.5 h-4 w-4 text-destructive" />
            )}
          </div>
          {usernameStatus === "taken" && (
            <p className="text-xs text-destructive">This username is already taken</p>
          )}
          {usernameStatus === "available" && (
            <p className="text-xs text-green-500">Username is available</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" {...form.register("email")} required className="bg-background/50" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" {...form.register("password")} autoComplete="new-password" required className="bg-background/50" />
        </div>
        <div className="space-y-2">
          <Label>Confirm</Label>
          <Input type="password" {...form.register("confirmPassword")} autoComplete="new-password" required className="bg-background/50" />
        </div>
      </div>

      <div className="h-px bg-border/50 my-4" />

      {/* Dynamic Role Fields */}
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
        {role === "artist" && (
          <>
            <div className="space-y-2">
              <Label>Primary Genre</Label>
              <Input {...form.register("genre")} placeholder="e.g. Techno" required className="bg-background/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Fee ($)</Label>
                <Input type="number" {...form.register("feeMin")} required className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Max Fee ($)</Label>
                <Input type="number" {...form.register("feeMax")} required className="bg-background/50" />
              </div>
            </div>
          </>
        )}

        {(role === "organizer" || role === "venue") && (
          <div className="space-y-2">
            <Label>{role === "venue" ? "Venue Name" : "Organization Name"}</Label>
            <Input {...form.register("organizationName")} required className="bg-background/50" />
          </div>
        )}

        {role === "venue" && (
          <>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input {...form.register("address")} required className="bg-background/50" />
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input type="number" {...form.register("capacity")} required className="bg-background/50" />
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm pt-2 pb-1 -mx-1 px-1 border-t border-white/10 md:static md:bg-transparent md:backdrop-blur-none md:border-0">
        <Button type="submit" className="w-full bg-primary" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? "Creating Account..." : "Create Account"}
        </Button>
      </div>
    </form>
  );
}
