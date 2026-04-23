import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Cloud,
  Shield,
  Zap,
  Share2,
  FolderOpen,
  HardDrive,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Cloud,
    title: "Cloud Storage",
    description:
      "Store all your files securely in the cloud. Access them from anywhere, anytime.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "End-to-end encryption ensures your files stay private. Only you control your data.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Optimized upload and download speeds. No more waiting for your files to sync.",
  },
  {
    icon: Share2,
    title: "Easy Sharing",
    description:
      "Share files and folders with anyone. Control permissions with granular access settings.",
  },
  {
    icon: FolderOpen,
    title: "Smart Organization",
    description:
      "Powerful search and tagging. Find any file in seconds with intelligent filtering.",
  },
  {
    icon: HardDrive,
    title: "Generous Storage",
    description:
      "Start with 15GB free. Upgrade anytime for unlimited storage options.",
  },
];

const highlights = [
  "15GB free storage",
  "No tracking or ads",
  "Open source",
  "Cross-platform apps",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <HardDrive className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">Aman Drive</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge variant="secondary" className="mb-6">
            A Google Drive Alternative
          </Badge>
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Your Files, Your Control
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            Aman Drive is a privacy-focused, open-source cloud storage solution.
            Store, share, and access your files from anywhere without
            compromising your data.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                Start for Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Highlights */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            {highlights.map((highlight) => (
              <div key={highlight} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Everything You Need
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Powerful features designed for modern workflows. Built for speed,
              security, and simplicity.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 bg-background">
                <CardHeader>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
          <h2 className="mb-4 text-3xl font-bold">
            Ready to Take Control?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-primary-foreground/80">
            Join thousands of users who have switched to a better cloud storage
            experience. Start with 15GB free.
          </p>
          <Link href="/sign-up">
            <Button
              size="lg"
              variant="secondary"
              className="gap-2"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              <span className="font-semibold">Aman Drive</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Aman Drive. Open source and privacy-focused.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
