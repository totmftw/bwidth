import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Music, Calendar, ShieldCheck, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-display font-bold text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
            BANDWIDTH
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth?mode=login">
              <Button variant="ghost" className="hover:text-primary">Log In</Button>
            </Link>
            <Link href="/auth?mode=register">
              <Button className="bg-white text-black hover:bg-gray-200">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col justify-center items-center text-center px-4 py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-4xl space-y-8"
        >
          <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight">
            The Operating System for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Live Music</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Connect artists, organizers, and venues in one seamless ecosystem. 
            Automated contracts, secure payments, and verified reputations.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/auth?mode=register&role=artist">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                I'm an Artist
              </Button>
            </Link>
            <Link href="/auth?mode=register&role=organizer">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-white/20 hover:bg-white/5">
                I'm an Organizer
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-card/30 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Music}
              title="Artist Discovery"
              description="Find verified talent that matches your genre and budget perfectly."
            />
            <FeatureCard 
              icon={Calendar}
              title="Seamless Booking"
              description="Negotiate offers, manage contracts, and sync calendars in one place."
            />
            <FeatureCard 
              icon={ShieldCheck}
              title="Verified Trust"
              description="Build your reputation with our Trust Score system based on real gig history."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50 text-center text-muted-foreground text-sm">
        <div className="container mx-auto px-4">
          <p>© 2024 Bandwidth Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-8 rounded-3xl bg-card border border-white/5 hover:border-primary/50 transition-all duration-300 shadow-2xl"
    >
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary">
        <Icon size={24} />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}
