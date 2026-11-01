import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Crown, CreditCard, Tag, BookMarked, History, Receipt, Settings,
  Calendar, TrendingUp, AlertCircle, Loader2, Trash2, Download, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getPremiumStatus,
  getBillingHistory,
  getMyCoupons,
  cancelSubscription,
} from "@/lib/subscription.functions";
import { usePremium } from "@/hooks/use-premium";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard — The United Hell" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const premium = usePremium();
  const getPremium = useServerFn(getPremiumStatus);
  const getBilling = useServerFn(getBillingHistory);
  const getCoupons = useServerFn(getMyCoupons);
  const cancelSub = useServerFn(cancelSubscription);

  const billingQ = useQuery({ queryKey: ["billing"], queryFn: () => getBilling() });
  const couponsQ = useQuery({ queryKey: ["my-coupons"], queryFn: () => getCoupons() });

  const cancelMut = useMutation({
    mutationFn: () => cancelSub(),
    onSuccess: () => {
      toast.success("Subscription canceled. Premium access remains until your current period ends.");
      premium.refresh();
      billingQ.refetch();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const [tab, setTab] = useState<"membership" | "billing" | "coupons" | "settings">("membership");

  async function onSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", search: { category: undefined } });
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";
  const formatMoney = (cents: number) => `₹${(cents / 100).toLocaleString("en-IN")}`;

  const TABS = [
    { id: "membership" as const, label: "Membership", icon: Crown },
    { id: "billing" as const, label: "Billing", icon: CreditCard },
    { id: "coupons" as const, label: "Coupons", icon: Tag },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className="container-read py-10 md:py-16">
      <header className="text-center border-b rule pb-8 mb-10">
        <div className="kicker">Your account</div>
        <h1 className="display-1 mt-3">Dashboard.</h1>
        {premium.isPremium && (
          <div className="inline-flex items-center gap-1.5 mt-4 px-4 py-1.5 bg-foreground text-background rounded-full text-xs font-bold uppercase tracking-widest">
            <Crown className="h-3.5 w-3.5" />
            Premium Member
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b rule overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* MEMBERSHIP TAB */}
      {tab === "membership" && (
        <div className="space-y-6">
          <div className="border rule p-6 rounded-lg">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="kicker mb-1">Membership Status</div>
                {premium.isPremium ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-serif text-2xl font-bold">Active Premium</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground" />
                    <span className="font-serif text-2xl font-bold">Free Reader</span>
                  </div>
                )}
              </div>
              {!premium.isPremium && (
                <Link
                  to="/epaper"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold border-2 border-foreground rounded-sm hover:bg-foreground hover:text-background transition"
                >
                  <Crown className="h-4 w-4" /> Subscribe
                </Link>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <InfoRow label="Plan" value={premium.planCode ? premium.planCode.charAt(0).toUpperCase() + premium.planCode.slice(1) : "—"} />
              <InfoRow label="Status" value={premium.status ? premium.status.charAt(0).toUpperCase() + premium.status.slice(1) : "—"} />
              <InfoRow label="Renewal / Expiry Date" value={formatDate(premium.currentPeriodEnd)} icon={Calendar} />
              <InfoRow label="Days Remaining" value={premium.daysRemaining !== null ? `${premium.daysRemaining} days` : "—"} icon={TrendingUp} />
            </div>

            {premium.isPremium && (
              <div className="mt-6 pt-6 border-t rule">
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel your subscription? Premium access continues until your current period ends.")) {
                      cancelMut.mutate();
                    }
                  }}
                  disabled={cancelMut.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-destructive/40 text-destructive rounded-sm hover:bg-destructive hover:text-destructive-foreground transition disabled:opacity-40"
                >
                  {cancelMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BILLING TAB */}
      {tab === "billing" && (
        <div className="space-y-6">
          {billingQ.isLoading && <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
          {billingQ.data && (
            <>
              <div className="border rule p-6 rounded-lg">
                <div className="kicker mb-4">Invoices</div>
                {billingQ.data.invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoices yet. Invoices appear here after your first payment.</p>
                ) : (
                  <div className="space-y-3">
                    {billingQ.data.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-3 border-b rule last:border-0">
                        <div>
                          <div className="font-mono text-sm font-semibold">{inv.invoice_number}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(inv.created_at)}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold">{formatMoney(inv.amount_cents)}</span>
                          {inv.pdf_url && (
                            <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition">
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border rule p-6 rounded-lg">
                <div className="kicker mb-4">Transaction History</div>
                {billingQ.data.transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                ) : (
                  <div className="space-y-3">
                    {billingQ.data.transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-3 border-b rule last:border-0">
                        <div>
                          <div className="text-sm font-semibold capitalize">{tx.plan_code} plan</div>
                          <div className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          {tx.coupon_code && <span className="text-xs px-2 py-0.5 bg-muted rounded font-mono">{tx.coupon_code}</span>}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            tx.status === "succeeded" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            tx.status === "failed" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                            "bg-muted text-muted-foreground"
                          }`}>{tx.status}</span>
                          <span className="font-semibold">{formatMoney(tx.amount_cents)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* COUPONS TAB */}
      {tab === "coupons" && (
        <div className="space-y-6">
          <div className="border rule p-6 rounded-lg">
            <div className="kicker mb-4">Your Coupons</div>
            {couponsQ.isLoading && <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
            {couponsQ.data && couponsQ.data.length === 0 && (
              <p className="text-sm text-muted-foreground">No coupons available. New users automatically receive a WELCOME50 coupon.</p>
            )}
            {couponsQ.data && couponsQ.data.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-4">
                {couponsQ.data.map((c) => (
                  <div key={c.id} className={`border-2 rounded-lg p-4 ${c.status === "available" ? "border-foreground/30" : "border-muted"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-lg">{c.code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        c.status === "available" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        c.status === "used" ? "bg-muted text-muted-foreground" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>{c.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.status === "available" ? "Valid for first purchase" : c.status === "used" ? `Used on ${formatDate(c.used_at)}` : "Expired"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === "settings" && (
        <div className="space-y-6">
          <div className="border rule p-6 rounded-lg">
            <div className="kicker mb-4">Account Settings</div>
            <div className="space-y-4">
              <Link to="/profile" className="flex items-center justify-between p-4 border rule rounded-sm hover:bg-muted/50 transition">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Edit Profile</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link to="/bookmarks" className="flex items-center justify-between p-4 border rule rounded-sm hover:bg-muted/50 transition">
                <div className="flex items-center gap-3">
                  <BookMarked className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Saved Articles</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <button
                onClick={onSignOut}
                className="w-full flex items-center justify-between p-4 border border-destructive/30 text-destructive rounded-sm hover:bg-destructive hover:text-destructive-foreground transition"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Sign Out</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Calendar }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <span className="font-serif text-lg font-semibold">{value}</span>
    </div>
  );
}
