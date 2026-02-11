import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

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
  const [location, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  // Extract query params manually since wouter doesn't provide them nicely in hook
  const searchParams = new URLSearchParams(window.location.search);
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  const initialRole = searchParams.get("role") || "artist";

  const [mode, setMode] = useState<"login" | "register">(initialMode);

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

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
  const { loginMutation } = useAuth();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
      <div className="space-y-2">
        <Label>Username</Label>
        <Input {...form.register("username")} className="bg-background/50" />
        {form.formState.errors.username && (
          <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <Input type="password" {...form.register("password")} className="bg-background/50" />
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
  const { registerMutation } = useAuth();
  const [role, setRole] = useState(initialRole);

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


    registerMutation.mutate(payload);
  };


  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
      <div className="space-y-2">
        <Label>I am a...</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue placeholder="Select Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="artist">Artist</SelectItem>
            <SelectItem value="organizer">Organizer</SelectItem>
            <SelectItem value="venue">Venue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input {...form.register("name")} required className="bg-background/50" />
        </div>
        <div className="space-y-2">
          <Label>Username</Label>
          <Input {...form.register("username")} required className="bg-background/50" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" {...form.register("email")} required className="bg-background/50" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" {...form.register("password")} required className="bg-background/50" />
        </div>
        <div className="space-y-2">
          <Label>Confirm</Label>
          <Input type="password" {...form.register("confirmPassword")} required className="bg-background/50" />
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

      <Button type="submit" className="w-full mt-4 bg-primary" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? "Creating Account..." : "Create Account"}
      </Button>
    </form>
  );
}
