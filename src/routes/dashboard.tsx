import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, EyeOff, ExternalLink, LogOut, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Client Portal" }] }),
  component: Dashboard,
});

type Cred = {
  id: string;
  app_name: string;
  app_url: string;
  app_email: string;
  app_password: string;
  plan: string | null;
  expires_at: string | null;
  notes: string | null;
};

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: creds, isLoading } = useQuery({
    queryKey: ["credentials", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_credentials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Cred[];
    },
  });

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <Link to="/" className="text-lg font-semibold">Client Portal</Link>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
            <LogOut className="h-4 w-4 mr-2" />Sign out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Your app credentials</h1>
          <p className="text-sm text-muted-foreground">Login details for the apps assigned to your account.</p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading credentials…</p>
        ) : !creds || creds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <KeyRound className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold">No credentials yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Once you purchase a plan, your app login details will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {creds.map((c) => <CredCard key={c.id} cred={c} />)}
          </div>
        )}
      </main>
    </div>
  );
}

function CredCard({ cred }: { cred: Cred }) {
  const [showPw, setShowPw] = useState(false);
  const copy = (label: string, val: string) => {
    navigator.clipboard.writeText(val);
    toast.success(`${label} copied`);
  };
  const expired = cred.expires_at && new Date(cred.expires_at) < new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{cred.app_name}</CardTitle>
            {cred.plan && <CardDescription className="mt-1">Plan: {cred.plan}</CardDescription>}
          </div>
          {cred.expires_at && (
            <Badge variant={expired ? "destructive" : "secondary"}>
              {expired ? "Expired" : `Expires ${new Date(cred.expires_at).toLocaleDateString()}`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="App URL">
          <Input readOnly value={cred.app_url} />
          <Button size="icon" variant="outline" onClick={() => window.open(cred.app_url, "_blank")} title="Open">
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => copy("URL", cred.app_url)} title="Copy">
            <Copy className="h-4 w-4" />
          </Button>
        </Field>
        <Field label="Email">
          <Input readOnly value={cred.app_email} />
          <Button size="icon" variant="outline" onClick={() => copy("Email", cred.app_email)} title="Copy">
            <Copy className="h-4 w-4" />
          </Button>
        </Field>
        <Field label="Password">
          <Input readOnly type={showPw ? "text" : "password"} value={cred.app_password} />
          <Button size="icon" variant="outline" onClick={() => setShowPw((s) => !s)} title="Toggle">
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="outline" onClick={() => copy("Password", cred.app_password)} title="Copy">
            <Copy className="h-4 w-4" />
          </Button>
        </Field>
        {cred.notes && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{cred.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
