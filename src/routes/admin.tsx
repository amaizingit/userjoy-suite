import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin } from "@/lib/use-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Client Portal" }] }),
  component: AdminPage,
});

type Profile = { id: string; email: string; full_name: string | null };
type Plan = { id: string; name: string; price: number; currency: string; duration_days: number | null };
type Sub = {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "expired" | "cancelled" | "pending";
  started_at: string;
  expires_at: string | null;
  plan: { name: string } | null;
};

function AdminPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, email, full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["admin-subs"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("id, user_id, plan_id, status, started_at, expires_at, plan:plans(name)")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Sub[];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["admin-plans"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("id, name, price, currency, duration_days").order("price");
      if (error) throw error;
      return data as Plan[];
    },
  });

  if (loading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Access denied</CardTitle>
            <CardDescription>You don't have admin access. Contact the site owner.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard"><Button variant="outline">Back to dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cancelSub = async (id: string) => {
    const { error } = await supabase
      .from("user_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Subscription cancelled");
    qc.invalidateQueries({ queryKey: ["admin-subs"] });
  };

  const reactivate = async (id: string) => {
    const { error } = await supabase
      .from("user_subscriptions")
      .update({ status: "active", cancelled_at: null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Subscription reactivated");
    qc.invalidateQueries({ queryKey: ["admin-subs"] });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />Admin
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
              <Link to="/admin" className="font-medium">Admin</Link>
            </nav>
          </div>
          <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
            <LogOut className="h-4 w-4 mr-2" />Sign out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Users ({profiles?.length ?? 0})</CardTitle>
            <CardDescription>All registered clients and their subscription status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Active subscription</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles?.map((p) => {
                  const userSubs = subs?.filter((s) => s.user_id === p.id) ?? [];
                  const active = userSubs.find((s) => s.status === "active");
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                      <TableCell>
                        {active ? (
                          <div className="flex items-center gap-2">
                            <Badge>{active.plan?.name ?? "—"}</Badge>
                            {active.expires_at && (
                              <span className="text-xs text-muted-foreground">
                                until {new Date(active.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="secondary">None</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <AssignDialog userId={p.id} plans={plans ?? []} onDone={() => qc.invalidateQueries({ queryKey: ["admin-subs"] })} />
                        <CredentialsDialog userId={p.id} userEmail={p.email} />
                        {active && (
                          <Button size="sm" variant="outline" onClick={() => cancelSub(active.id)}>
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {profiles?.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No users yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All subscriptions ({subs?.length ?? 0})</CardTitle>
            <CardDescription>Full history across users.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs?.map((s) => {
                  const u = profiles?.find((p) => p.id === s.user_id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{u?.email ?? s.user_id.slice(0, 8)}</TableCell>
                      <TableCell>{s.plan?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "active" ? "default" : s.status === "cancelled" ? "destructive" : "secondary"}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(s.started_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {s.status === "active" ? (
                          <Button size="sm" variant="outline" onClick={() => cancelSub(s.id)}>Cancel</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => reactivate(s.id)}>Reactivate</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {subs?.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No subscriptions yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function AssignDialog({ userId, plans, onDone }: { userId: string; plans: Plan[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState("");
  const [days, setDays] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!planId) return toast.error("Pick a plan");
    setBusy(true);
    const plan = plans.find((p) => p.id === planId);
    const duration = days ? parseInt(days, 10) : plan?.duration_days ?? null;
    const expires = duration
      ? new Date(Date.now() + duration * 86400000).toISOString()
      : null;
    const { error } = await supabase.from("user_subscriptions").insert({
      user_id: userId,
      plan_id: planId,
      status: "active",
      expires_at: expires,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Subscription activated");
    setOpen(false);
    setPlanId("");
    setDays("");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Assign plan</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activate subscription</DialogTitle>
          <DialogDescription>Choose a plan to activate for this user.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.currency} {Number(p.price).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Duration override (days, optional)</Label>
            <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="Uses plan default if empty" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Activate"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CredRow = {
  id: string;
  app_name: string;
  app_url: string;
  app_email: string;
  app_password: string;
  plan: string | null;
  expires_at: string | null;
  notes: string | null;
};

function CredentialsDialog({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    app_name: "",
    app_url: "",
    app_email: "",
    app_password: "",
    plan: "",
    expires_at: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  const { data: creds, refetch } = useQuery({
    queryKey: ["admin-creds", userId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_credentials")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CredRow[];
    },
  });

  const reset = () => setForm({ app_name: "", app_url: "", app_email: "", app_password: "", plan: "", expires_at: "", notes: "" });

  const add = async () => {
    if (!form.app_name || !form.app_url || !form.app_email || !form.app_password) {
      return toast.error("App name, URL, email and password are required");
    }
    setBusy(true);
    const { error } = await supabase.from("app_credentials").insert({
      user_id: userId,
      app_name: form.app_name,
      app_url: form.app_url,
      app_email: form.app_email,
      app_password: form.app_password,
      plan: form.plan || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      notes: form.notes || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Credential added");
    reset();
    refetch();
    qc.invalidateQueries({ queryKey: ["credentials", userId] });
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("app_credentials").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    refetch();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Credentials</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>App credentials</DialogTitle>
          <DialogDescription>Manage app login details for {userEmail}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Existing ({creds?.length ?? 0})</h3>
          {creds && creds.length > 0 ? (
            <div className="space-y-2">
              {creds.map((c) => (
                <div key={c.id} className="flex items-start justify-between border rounded p-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="font-medium">{c.app_name}</p>
                    <p className="text-muted-foreground text-xs">{c.app_url}</p>
                    <p className="text-muted-foreground text-xs">{c.app_email}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => del(c.id)}>Delete</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No credentials yet.</p>
          )}
        </div>

        <div className="border-t pt-4 space-y-3">
          <h3 className="text-sm font-medium">Add new</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>App name *</Label>
              <Input value={form.app_name} onChange={(e) => setForm({ ...form, app_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>App URL *</Label>
              <Input value={form.app_url} onChange={(e) => setForm({ ...form, app_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>App email *</Label>
              <Input value={form.app_email} onChange={(e) => setForm({ ...form, app_email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>App password *</Label>
              <Input value={form.app_password} onChange={(e) => setForm({ ...form, app_password: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Plan label</Label>
              <Input value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Expires at</Label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={add} disabled={busy}>{busy ? "Saving…" : "Add credential"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
