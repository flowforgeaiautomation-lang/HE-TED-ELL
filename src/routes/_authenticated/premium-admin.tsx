import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Crown, Users, CreditCard, Tag, TrendingUp, Plus, Loader2,
  IndianRupee, Calendar, Gift,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminGetSubscriptions,
  adminGetRevenue,
  adminGetCoupons,
  adminCreateCoupon,
} from "@/lib/subscription.functions";

export const Route = createFileRoute("/_authenticated/premium-admin")({
  head: () => ({ meta: [{ title: "Premium Admin — The United Hell" }] }),
  component: PremiumAdminPage,
});

function PremiumAdminPage() {
  const [tab, setTab] = useState<"overview" | "subscriptions" | "coupons" | "create-coupon">("overview");

  const getSubs = useServerFn(adminGetSubscriptions);
  const getRevenue = useServerFn(adminGetRevenue);
  const getCoupons = useServerFn(adminGetCoupons);
  const createCoupon = useServerFn(adminCreateCoupon);

  const subsQ = useQuery({ queryKey: ["admin-subs"], queryFn: () => getSubs() });
  const revenueQ = useQuery({ queryKey: ["admin-revenue"], queryFn: () => getRevenue() });
  const couponsQ = useQuery({ queryKey: ["admin-coupons"], queryFn: () => getCoupons() });

  const [couponForm, setCouponForm] = useState({
    code: "", description: "", discountType: "percentage" as "percentage" | "fixed",
    discountValue: 10, maxUses: "", validUntil: "", autoApply: false, eligibleOnlyNewUsers: false,
  });

  const createMut = useMutation({
    mutationFn: () => createCoupon({
      data: {
        code: couponForm.code,
        description: couponForm.description || undefined,
        discountType: couponForm.discountType,
        discountValue: couponForm.discountValue,
        maxUses: couponForm.maxUses ? parseInt(couponForm.maxUses) : null,
        validUntil: couponForm.validUntil || null,
        autoApply: couponForm.autoApply,
        eligibleOnlyNewUsers: couponForm.eligibleOnlyNewUsers,
      },
    }),
    onSuccess: () => {
      toast.success(`Coupon ${couponForm.code} created!`);
      couponsQ.refetch();
      setTab("coupons");
      setCouponForm({ code: "", description: "", discountType: "percentage", discountValue: 10, maxUses: "", validUntil: "", autoApply: false, eligibleOnlyNewUsers: false });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const formatMoney = (cents: number) => `₹${(cents / 100).toLocaleString("en-IN")}`;
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const TABS = [
    { id: "overview" as const, label: "Overview", icon: TrendingUp },
    { id: "subscriptions" as const, label: "Subscriptions", icon: Crown },
    { id: "coupons" as const, label: "Coupons", icon: Tag },
    { id: "create-coupon" as const, label: "Create Coupon", icon: Plus },
  ];

  return (
    <div className="container-read py-10 md:py-16">
      <header className="text-center border-b rule pb-8 mb-10">
        <div className="kicker">Editorial ops</div>
        <h1 className="display-1 mt-3">Premium Admin.</h1>
        <p className="dek mt-3">Manage subscriptions, coupons, revenue, and user access.</p>
      </header>

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

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="space-y-6">
          {revenueQ.isLoading && <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
          {revenueQ.data && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Revenue" value={revenueQ.data.displayTotal} icon={IndianRupee} />
              <StatCard label="Last 30 Days" value={revenueQ.data.displayMonthly} icon={TrendingUp} />
              <StatCard label="Monthly Subscribers" value={String(revenueQ.data.monthlySubscribers)} icon={Users} />
              <StatCard label="Yearly Subscribers" value={String(revenueQ.data.yearlySubscribers)} icon={Crown} />
            </div>
          )}
          <div className="border rule p-6 rounded-lg">
            <div className="kicker mb-4">Recent Subscriptions</div>
            {subsQ.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            {subsQ.data && subsQ.data.length === 0 && <p className="text-sm text-muted-foreground">No subscriptions yet.</p>}
            {subsQ.data && subsQ.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b rule text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-4">User</th>
                      <th className="py-2 pr-4">Plan</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Started</th>
                      <th className="py-2 pr-4">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subsQ.data.slice(0, 10).map((s) => (
                      <tr key={s.id} className="border-b rule last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">{s.user_id.slice(0, 8)}...</td>
                        <td className="py-2 pr-4 capitalize">{s.plan_code}</td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            s.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            s.status === "canceled" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                            "bg-muted text-muted-foreground"
                          }`}>{s.status}</span>
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">{formatDate(s.created_at)}</td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">{formatDate(s.current_period_end)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBSCRIPTIONS */}
      {tab === "subscriptions" && (
        <div className="border rule p-6 rounded-lg">
          <div className="kicker mb-4">All Subscriptions</div>
          {subsQ.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {subsQ.data && subsQ.data.length === 0 && <p className="text-sm text-muted-foreground">No subscriptions yet.</p>}
          {subsQ.data && subsQ.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b rule text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Period Start</th>
                    <th className="py-2 pr-4">Period End</th>
                    <th className="py-2 pr-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {subsQ.data.map((s) => (
                    <tr key={s.id} className="border-b rule last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{s.user_id.slice(0, 8)}...</td>
                      <td className="py-2 pr-4 capitalize">{s.plan_code}</td>
                      <td className="py-2 pr-4 capitalize">{s.status}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{formatDate(s.current_period_start)}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{formatDate(s.current_period_end)}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{formatDate(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* COUPONS */}
      {tab === "coupons" && (
        <div className="border rule p-6 rounded-lg">
          <div className="kicker mb-4">All Coupons</div>
          {couponsQ.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {couponsQ.data && couponsQ.data.length === 0 && <p className="text-sm text-muted-foreground">No coupons yet.</p>}
          {couponsQ.data && couponsQ.data.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              {couponsQ.data.map((c) => (
                <div key={c.id} className="border-2 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-lg">{c.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${c.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">{c.description || "—"}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Discount:</span> {c.discount_type === "percentage" ? `${c.discount_value}%` : formatMoney(c.discount_value)}</div>
                    <div><span className="text-muted-foreground">Used:</span> {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}</div>
                    <div><span className="text-muted-foreground">Per user:</span> {c.max_uses_per_user}</div>
                    <div><span className="text-muted-foreground">Auto-apply:</span> {c.auto_apply ? "Yes" : "No"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE COUPON */}
      {tab === "create-coupon" && (
        <div className="border rule p-6 rounded-lg max-w-lg">
          <div className="kicker mb-4">Create New Coupon</div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Code</label>
              <input
                value={couponForm.code}
                onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. FESTIVE25"
                className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm uppercase tracking-wider outline-none focus:border-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description (optional)</label>
              <input
                value={couponForm.description}
                onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                placeholder="e.g. Diwali festival offer"
                className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm outline-none focus:border-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Discount Type</label>
                <select
                  value={couponForm.discountType}
                  onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as "percentage" | "fixed" })}
                  className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm outline-none focus:border-foreground"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Value ({couponForm.discountType === "percentage" ? "%" : "₹"})
                </label>
                <input
                  type="number"
                  value={couponForm.discountValue}
                  onChange={(e) => setCouponForm({ ...couponForm, discountValue: parseInt(e.target.value) || 0 })}
                  className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm outline-none focus:border-foreground"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Max Uses (blank = unlimited)</label>
                <input
                  type="number"
                  value={couponForm.maxUses}
                  onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                  placeholder="Unlimited"
                  className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm outline-none focus:border-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Valid Until (blank = forever)</label>
                <input
                  type="date"
                  value={couponForm.validUntil}
                  onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                  className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm outline-none focus:border-foreground"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={couponForm.autoApply}
                  onChange={(e) => setCouponForm({ ...couponForm, autoApply: e.target.checked })}
                />
                Auto-apply to eligible users
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={couponForm.eligibleOnlyNewUsers}
                  onChange={(e) => setCouponForm({ ...couponForm, eligibleOnlyNewUsers: e.target.checked })}
                />
                New users only
              </label>
            </div>
            <button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !couponForm.code || couponForm.discountValue <= 0}
              className="w-full bg-foreground text-background py-3 text-sm font-bold uppercase tracking-wider hover:opacity-90 transition disabled:opacity-40 rounded-sm flex items-center justify-center gap-2"
            >
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Coupon
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof TrendingUp }) {
  return (
    <div className="border rule p-5 rounded-lg">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="font-serif text-2xl font-bold">{value}</div>
    </div>
  );
}
