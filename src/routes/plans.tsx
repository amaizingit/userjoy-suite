import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, LogOut } from "lucide-react";

export const Route = createFileRoute("/plans")({
  head: () => ({ meta: [{ title: "Plans — Client Portal" }] }),
  component: PlansPage,
});

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number | null;
  features: string[] | null;
};

type Subscription = {
  id: string;
  plan_id: string;
  status: "active" | "expired" | "cancelled" | "pending";
  started_at: string;
  expires_at: string | null;
};

function PlansPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["plans"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return data as unknown as Plan[];
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["subs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data as Subscription[];
    },
  });

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const activeSub = subs?.find((s) => s.status === "active");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold">Client Portal</Link>
            <nav className="flex gap-4 text-sm">
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
              <Link to="/plans" className="font-medium">Plans</Link>
            </nav>
          </div>
          <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
            <LogOut className="h-4 w-4 mr-2" />Sign out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Choose your plan</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Subscribe to a plan to receive your app login details.
          </p>
        </div>

        {plansLoading ? (
          <p className="text-center text-muted-foreground">Loading plans…</p>
        ) : !plans || plans.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center text-muted-foreground">
              No plans available yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((p) => {
              const isCurrent = activeSub?.plan_id === p.id;
              const features = Array.isArray(p.features) ? p.features : [];
              return (
                <Card key={p.id} className={isCurrent ? "border-primary shadow-lg" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{p.name}</CardTitle>
                      {isCurrent && <Badge>Current</Badge>}
                    </div>
                    {p.description && <CardDescription>{p.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-3xl font-bold">
                        {p.currency} {Number(p.price).toFixed(2)}
                      </span>
                      {p.duration_days && (
                        <span className="text-sm text-muted-foreground"> / {p.duration_days} days</span>
                      )}
                    </div>
                    {features.length > 0 && (
                      <ul className="space-y-2 text-sm">
                        {features.map((f, i) => (
                          <li key={i} className="flex gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button className="w-full" disabled={isCurrent} variant={isCurrent ? "secondary" : "default"}>
                      {isCurrent ? "Current plan" : "Contact to subscribe"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
