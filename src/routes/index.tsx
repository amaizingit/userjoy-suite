import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { KeyRound, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Client Portal — Manage your app credentials" },
      { name: "description", content: "Sign in to view and manage the login details for your purchased app." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold">Client Portal</h1>
          <div className="flex gap-2">
            {user ? (
              <Button asChild><Link to="/dashboard">Dashboard</Link></Button>
            ) : (
              <>
                <Button variant="outline" asChild><Link to="/auth">Sign in</Link></Button>
                <Button asChild><Link to="/auth">Get started</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-20">
        <section className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Your app, your credentials.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Securely access the login details for the app provisioned to you after your purchase.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <Button size="lg" asChild>
              <Link to={user ? "/dashboard" : "/auth"}>
                {user ? "Go to dashboard" : "Sign in to your portal"}
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-20 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Feature icon={<KeyRound className="h-5 w-5" />} title="Your credentials">
            View the URL, email, and password for your dedicated app instance.
          </Feature>
          <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Private to you">
            Only you can see your credentials — protected by row-level security.
          </Feature>
          <Feature icon={<Zap className="h-5 w-5" />} title="One click access">
            Open your app and copy credentials with a single click.
          </Feature>
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-6">
      <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-3">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
