import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Target, BarChart3, PieChart } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function AdminNegotiationAnalytics() {
  const analytics = useQuery({
    queryKey: ["/api/admin/negotiation/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/negotiation/analytics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  const outcomes = useQuery({
    queryKey: ["/api/admin/negotiation/outcomes"],
    queryFn: async () => {
      const res = await fetch("/api/admin/negotiation/outcomes?limit=20", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (analytics.isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const data = analytics.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Negotiation Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Negotiations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {data?.total ? Math.round((data.outcomes.signed / data.total) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg Rounds</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data?.avgRoundsToAgreement ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg Fee Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {data?.avgFeeAccuracy !== null ? `±₹${data.avgFeeAccuracy.toLocaleString()}` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outcome Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" /> Outcome Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.outcomes && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm">Signed</span>
                <div className="flex items-center gap-2">
                  <Progress value={data.total ? (data.outcomes.signed / data.total) * 100 : 0} className="w-40 h-2" />
                  <Badge variant="outline" className="text-green-700 bg-green-50">{data.outcomes.signed}</Badge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Rejected / Walked Away</span>
                <div className="flex items-center gap-2">
                  <Progress value={data.total ? (data.outcomes.rejected / data.total) * 100 : 0} className="w-40 h-2" />
                  <Badge variant="outline" className="text-red-700 bg-red-50">{data.outcomes.rejected}</Badge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Expired</span>
                <div className="flex items-center gap-2">
                  <Progress value={data.total ? (data.outcomes.expired / data.total) * 100 : 0} className="w-40 h-2" />
                  <Badge variant="outline" className="text-amber-700 bg-amber-50">{data.outcomes.expired}</Badge>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Rounds Distribution */}
      {data?.roundsDistribution && Object.keys(data.roundsDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Rounds to Agreement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 h-32">
              {Object.entries(data.roundsDistribution).sort(([a], [b]) => Number(a) - Number(b)).map(([round, count]: any) => (
                <div key={round} className="flex flex-col items-center gap-1">
                  <div className="bg-primary/80 rounded-t w-12" style={{ height: `${Math.max(8, (count / data.total) * 100)}%` }} />
                  <span className="text-xs text-muted-foreground">R{round}</span>
                  <span className="text-xs font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Genre Breakdown */}
      {data?.byGenre && Object.keys(data.byGenre).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Performance by Genre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.byGenre).sort(([, a]: any, [, b]: any) => b.count - a.count).map(([genre, stats]: any) => (
                <div key={genre} className="flex justify-between items-center py-1 border-b last:border-0">
                  <span className="text-sm font-medium">{genre}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{stats.count} negotiations</span>
                    {stats.avgFee && (
                      <Badge variant="secondary" className="text-xs">Avg ₹{stats.avgFee.toLocaleString()}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Outcomes Table */}
      {outcomes.data && outcomes.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-2">Booking</th>
                    <th className="py-2 px-2">Outcome</th>
                    <th className="py-2 px-2">Genre</th>
                    <th className="py-2 px-2">Final Fee</th>
                    <th className="py-2 px-2">Rounds</th>
                    <th className="py-2 px-2">Fee Accuracy</th>
                    <th className="py-2 px-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {outcomes.data.map((o: any) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-2 px-2">#{o.bookingId}</td>
                      <td className="py-2 px-2">
                        <Badge variant={o.outcome === "signed" ? "default" : o.outcome === "expired" ? "secondary" : "destructive"} className="text-xs">
                          {o.outcome}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{o.genre || "—"}</td>
                      <td className="py-2 px-2">{o.finalFee ? `₹${Number(o.finalFee).toLocaleString()}` : "—"}</td>
                      <td className="py-2 px-2">{o.roundsToAgreement ?? "—"}</td>
                      <td className="py-2 px-2">
                        {o.feeAccuracyDelta !== null ? (
                          <span className={Number(o.feeAccuracyDelta) > 0 ? "text-green-600" : "text-red-600"}>
                            {Number(o.feeAccuracyDelta) > 0 ? "+" : ""}₹{Number(o.feeAccuracyDelta).toLocaleString()}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
