import { useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, startOfYear, startOfMonth, endOfMonth, getWeek } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, PawPrint, RefreshCcw, RotateCcw, Sparkles, TrendingUp, Car } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useSpots, useCreateSpot, useDeleteSpot } from "@/hooks/use-spots";
import leopardBg from "@/assets/images/leopard-bg.png";
import leopardPattern from "@/assets/images/leopard-pattern.png";
import leopardsImg from "@/assets/leopards.png";

type PlayerId = "A" | "B";

type Spot = {
  id: string;
  player: string;
  at: number;
  cutuDriving: boolean;
};

type Prediction = {
  a: number;
  b: number;
  explanation: string;
  confidenceLabel: string;
};

const NOW = new Date();
const YEAR = NOW.getFullYear();
const IST_TZ_LABEL = "IST";

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

function withinMinutes(ts: number, minutes: number) {
  return Date.now() - ts <= minutes * 60_000;
}

function formatTime(ts: number) {
  return format(new Date(ts), "MMM d, h:mm a");
}

function computePrediction(params: {
  aScore: number;
  bScore: number;
  aRecent: number;
  bRecent: number;
  dayOfYear: number;
  totalDays: number;
}): Prediction {
  const { aScore, bScore, aRecent, bRecent, dayOfYear, totalDays } = params;

  const lead = aScore - bScore;
  const recentDiff = aRecent - bRecent;

  const progress = clamp01(dayOfYear / Math.max(1, totalDays));

  const x =
    lead * (0.55 + 0.55 * progress) +
    recentDiff * 0.85 +
    Math.log1p(aScore + bScore) * 0.12;

  const aProb = clamp01(sigmoid(x));
  const bProb = 1 - aProb;

  const leadText =
    lead === 0
      ? "It’s currently tied"
      : lead > 0
        ? `Cutu leads by ${lead}`
        : `Tamtam leads by ${Math.abs(lead)}`;

  const recentText =
    recentDiff === 0
      ? "both of you have been spotting at the same pace lately"
      : recentDiff > 0
        ? `Cutu has been spotting more in the last 14 days (+${recentDiff})`
        : `Tamtam's pace has picked up in the last 14 days (+${Math.abs(recentDiff)})`;

  const confidenceLabel =
    Math.max(aProb, bProb) >= 0.8
      ? "Strong lean"
      : Math.max(aProb, bProb) >= 0.65
        ? "Lean"
        : "Anyone’s game";

  const explanation = `${leadText}, and ${recentText}. (${confidenceLabel} — for fun only.)`;

  return {
    a: aProb,
    b: bProb,
    explanation,
    confidenceLabel,
  };
}

function getRecentCounts(spots: Spot[], days: number) {
  const cutoff = addDays(new Date(), -days).getTime();
  let a = 0;
  let b = 0;
  for (const s of spots) {
    if (s.at >= cutoff) {
      if (s.player === "A") a += 1;
      if (s.player === "B") b += 1;
    }
  }
  return { a, b };
}

function scoreFromSpots(spots: Spot[]) {
  let a = 0;
  let b = 0;
  for (const s of spots) {
    if (s.player === "A") a += 1;
    if (s.player === "B") b += 1;
  }
  return { a, b };
}

export default function DashboardPage() {
  const [youName] = useState("Cutu");
  const [friendName] = useState("Tamtam");

  const { data: spots = [], isLoading } = useSpots();
  const createSpotMutation = useCreateSpot();
  const deleteSpotMutation = useDeleteSpot();
  const [lastPredictionAt, setLastPredictionAt] = useState<number | null>(null);
  const [cutuDrivingChecked, setCutuDrivingChecked] = useState(false);

  const scores = useMemo(() => scoreFromSpots(spots), [spots]);
  const recent14 = useMemo(() => getRecentCounts(spots, 14), [spots]);

  const yearStart = startOfYear(NOW);
  const dayOfYear = Math.max(1, differenceInCalendarDays(NOW, yearStart) + 1);
  const totalDays = differenceInCalendarDays(addDays(yearStart, 365), yearStart);

  const totalSpots = scores.a + scores.b;
  const hasEnoughData = totalSpots >= 10;

  const prediction = useMemo(() => {
    if (!hasEnoughData) return null;

    return computePrediction({
      aScore: scores.a,
      bScore: scores.b,
      aRecent: recent14.a,
      bRecent: recent14.b,
      dayOfYear,
      totalDays,
    });
  }, [hasEnoughData, scores.a, scores.b, recent14.a, recent14.b, dayOfYear, totalDays]);

  const leader: PlayerId | "TIE" =
    scores.a === scores.b ? "TIE" : scores.a > scores.b ? "A" : "B";

  const leadBy = Math.abs(scores.a - scores.b);

  const weeklyChartData = useMemo(() => {
    const monthStart = startOfMonth(NOW);
    const monthEnd = endOfMonth(NOW);
    const weeks: { week: string; Cutu: number; Tamtam: number }[] = [];
    
    let weekNum = 1;
    let currentWeekStart = monthStart;
    
    while (currentWeekStart <= monthEnd) {
      const weekEnd = addDays(currentWeekStart, 6);
      const weekStartTs = currentWeekStart.getTime();
      const weekEndTs = Math.min(weekEnd.getTime(), monthEnd.getTime()) + 86400000;
      
      let cutuCount = 0;
      let tamtamCount = 0;
      
      for (const s of spots) {
        if (s.at >= weekStartTs && s.at < weekEndTs) {
          if (s.player === "A") cutuCount++;
          else tamtamCount++;
        }
      }
      
      weeks.push({
        week: `Week ${weekNum}`,
        Cutu: cutuCount,
        Tamtam: tamtamCount,
      });
      
      weekNum++;
      currentWeekStart = addDays(currentWeekStart, 7);
    }
    
    return weeks;
  }, [spots]);

  const pieChartData = useMemo(() => {
    const monthStart = startOfMonth(NOW);
    const monthEnd = endOfMonth(NOW);
    const monthStartTs = monthStart.getTime();
    const monthEndTs = monthEnd.getTime() + 86400000;

    let cutuTotal = 0;
    let cutuDriving = 0;
    let tamtamTotal = 0;
    let tamtamDriving = 0;

    for (const s of spots) {
      if (s.at >= monthStartTs && s.at < monthEndTs) {
        if (s.player === "A") {
          cutuTotal++;
          if (s.cutuDriving) cutuDriving++;
        } else {
          tamtamTotal++;
          if (s.cutuDriving) tamtamDriving++;
        }
      }
    }

    return {
      cutu: [
        { name: "Cutu driving", value: cutuDriving, color: "hsl(var(--primary))" },
        { name: "Other", value: Math.max(0, cutuTotal - cutuDriving), color: "hsl(var(--muted))" },
      ],
      tamtam: [
        { name: "Cutu driving", value: tamtamDriving, color: "hsl(var(--accent))" },
        { name: "Other", value: Math.max(0, tamtamTotal - tamtamDriving), color: "hsl(var(--muted))" },
      ],
      cutuTotal,
      tamtamTotal,
    };
  }, [spots]);

  function addSpot(player: PlayerId) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const at = Date.now();
    createSpotMutation.mutate({ id, player, at, cutuDriving: cutuDrivingChecked }, {
      onSuccess: () => {
        setLastPredictionAt(at);
        setCutuDrivingChecked(false);
      },
    });
  }

  function undoLastSpot() {
    const last = spots[0];
    if (!last) return;

    if (!withinMinutes(last.at, 10)) {
      toast({
        title: "Undo window expired",
        description: "You can only undo within 10 minutes of the last spot.",
      });
      return;
    }

    deleteSpotMutation.mutate(last.id, {
      onSuccess: () => {
        setLastPredictionAt(Date.now());
        toast({ title: "Last spot undone" });
      },
    });
  }

  function refreshPrediction() {
    setLastPredictionAt(Date.now());
    toast({
      title: "Prediction refreshed",
      description: "Recalculated from your current scores and recent pace.",
    });
  }

  const last10 = spots.slice(0, 10);

  const statusLine =
    leader === "TIE"
      ? "Tied up. Neck and neck."
      : leader === "A"
        ? `${youName} leading by ${leadBy}`
        : `${friendName} leading by ${leadBy}`;

  return (
    <div className="grain">
      <div className="mb-6 flex flex-col gap-2 md:mb-8">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full" data-testid="badge-year">
            {YEAR} season
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full border-[hsl(var(--border))] bg-background/60"
            data-testid="badge-total-spots"
          >
            {totalSpots} total spots
          </Badge>
        </div>

        <h1
          className="text-balance font-serif text-3xl tracking-tight md:text-4xl"
          data-testid="text-title"
        >
          Spot the Biptiya. Claim points. Win the year.
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-12 md:gap-6">
        <Card 
          className="soft-ring relative overflow-hidden border p-5 md:col-span-7 md:p-6"
          style={{
            backgroundImage: `url(${leopardBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-background/50" aria-hidden="true" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold" data-testid="text-standings-title">
                    Standings
                  </div>
                  {leader !== "TIE" ? (
                    <Badge className="rounded-full" data-testid="badge-leader">
                      {leader === "A" ? "Cutu" : "Tamtam"} leading
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="rounded-full" data-testid="badge-leader">
                      Tied
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-sm text-muted-foreground" data-testid="text-lead-status">
                  {statusLine}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="font-bold" onClick={undoLastSpot} data-testid="button-undo-last">
                  <RotateCcw className="mr-2 size-4" />
                  Undo
                </Button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-2xl border bg-background/60 p-3">
              <Checkbox 
                id="cutu-driving" 
                checked={cutuDrivingChecked}
                onCheckedChange={(checked) => setCutuDrivingChecked(checked === true)}
                data-testid="checkbox-cutu-driving"
              />
              <label 
                htmlFor="cutu-driving" 
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Car className="size-4 text-[hsl(var(--primary))]" />
                Cutu driving
              </label>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-background/60 p-4 relative overflow-hidden">
                <PawPrint className="absolute -right-2 -bottom-2 size-12 opacity-5 -rotate-12" />
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground" data-testid="text-player-a-label">
                    {youName}
                    {leader === "A" && <Crown className="inline-block ml-1.5 size-3.5 text-[hsl(var(--primary))]" />}
                  </div>
                  <Badge variant="outline" className="rounded-full" data-testid="badge-player-a-recent">
                    {recent14.a} last 14d
                  </Badge>
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="font-serif text-5xl leading-none" data-testid="text-score-a">
                    {scores.a}
                  </div>
                  <Button className="h-12 rounded-2xl px-4" onClick={() => addSpot("A")} data-testid="button-spot-you">
                    SPOT! +1
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border bg-background/60 p-4 relative overflow-hidden">
                <PawPrint className="absolute -right-2 -bottom-2 size-12 opacity-5 rotate-12" />
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground" data-testid="text-player-b-label">
                    {friendName}
                    {leader === "B" && <Crown className="inline-block ml-1.5 size-3.5 text-[hsl(var(--primary))]" />}
                  </div>
                  <Badge variant="outline" className="rounded-full" data-testid="badge-player-b-recent">
                    {recent14.b} last 14d
                  </Badge>
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="font-serif text-5xl leading-none" data-testid="text-score-b">
                    {scores.b}
                  </div>
                  <Button
                    variant="secondary"
                    className="h-12 rounded-2xl px-4"
                    onClick={() => addSpot("B")}
                    data-testid="button-spot-friend"
                  >
                    SPOT! +1
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full" data-testid="badge-tiebreaker">
                Tiebreaker: whoever reaches the final score first
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="soft-ring border p-5 md:col-span-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[hsl(var(--primary))]" />
                <div className="font-semibold leading-tight" data-testid="text-ai-title">
                  Predictive<br />Winner AI
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refreshPrediction} data-testid="button-refresh-prediction">
              <RefreshCcw className="mr-2 size-4" />
              Refresh
            </Button>
          </div>

          <div className="my-4 flex justify-center">
            <img 
              src={leopardsImg} 
              alt="Leopards illustration" 
              className="max-h-48 w-auto object-contain"
              data-testid="img-leopards"
            />
          </div>

          {!hasEnoughData ? (
            <div className="rounded-2xl border bg-muted/40 p-4" data-testid="panel-ai-empty">
              <div className="font-medium">Not enough data yet</div>
              <p className="mt-1 text-sm text-muted-foreground">Add at least 10 spottings to unlock the prediction.</p>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <div className="rounded-full border bg-background/70 px-3 py-1" data-testid="text-ai-progress">
                  {totalSpots}/10
                </div>
                <Progress value={(totalSpots / 10) * 100} data-testid="progress-ai-unlock" />
              </div>
            </div>
          ) : (
            <div data-testid="panel-ai-prediction">
              <div className="grid gap-3">
                <div 
                  className="rounded-2xl border p-4 relative overflow-hidden"
                  style={{
                    backgroundImage: `url(${leopardPattern})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-0 bg-background/50" />
                  <div className="relative flex items-center justify-between">
                    <div className="font-bold text-[18px] text-[#1f2025]" data-testid="text-ai-you-label">
                      {youName}
                    </div>
                    <div className="font-serif text-4xl text-[#1f2025]" data-testid="text-ai-you-prob">
                      {Math.round((prediction?.a ?? 0) * 100)}%
                    </div>
                  </div>
                  <div className="relative mt-3">
                    <Progress value={(prediction?.a ?? 0) * 100} className="h-2" data-testid="progress-ai-you" />
                  </div>
                </div>

                <div 
                  className="rounded-2xl border p-4 relative overflow-hidden"
                  style={{
                    backgroundImage: `url(${leopardPattern})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-0 bg-background/50" />
                  <div className="relative flex items-center justify-between">
                    <div className="font-bold text-[18px] text-[#1c1d21]" data-testid="text-ai-friend-label">
                      {friendName}
                    </div>
                    <div className="font-serif text-4xl text-[#1c1d21]" data-testid="text-ai-friend-prob">
                      {Math.round((prediction?.b ?? 0) * 100)}%
                    </div>
                  </div>
                  <div className="relative mt-3">
                    <Progress value={(prediction?.b ?? 0) * 100} className="h-2" data-testid="progress-ai-friend" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="soft-ring border p-5 md:col-span-12 md:p-6">
          <Tabs defaultValue="recent" className="w-full">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Crown className="size-4 text-[hsl(var(--primary))]" />
                <div className="font-semibold" data-testid="text-activity-title">
                  Activity
                </div>
                <Badge variant="secondary" className="rounded-full" data-testid="badge-last10">
                  Last 10
                </Badge>
              </div>
              <TabsList className="rounded-full" data-testid="tabs-activity">
                <TabsTrigger value="recent" className="rounded-full" data-testid="tab-recent">
                  Recent
                </TabsTrigger>
                <TabsTrigger value="rules" className="rounded-full" data-testid="tab-rules">
                  Rules
                </TabsTrigger>
                <TabsTrigger value="dive-in" className="rounded-full" data-testid="tab-dive-in">
                  Dive in
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="recent" className="mt-4">
              <div className="grid gap-2">
                <AnimatePresence initial={false}>
                  {last10.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground"
                      data-testid="empty-recent-spots"
                    >
                     Biptiya no have. First sighting wins the vibe.
                    </motion.div>
                  ) : (
                    last10.map((s, idx) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.18 }}
                        className="flex items-center justify-between rounded-2xl border bg-background/60 p-3"
                        data-testid={`row-spot-${idx}`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={
                              "size-2.5 rounded-full " +
                              (s.player === "A" ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--accent))]")
                            }
                            aria-hidden="true"
                          />
                          <div className="text-sm" data-testid={`text-spot-player-${idx}`}>
                            {s.player === "A" ? youName : friendName}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground" data-testid={`text-spot-time-${idx}`}>
                          {formatTime(s.at)}
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>

            <TabsContent value="rules" className="mt-4">
              <div className="grid gap-3">
                <div className="rounded-2xl border bg-background/60 p-4">
                  <div className="font-medium" data-testid="text-rules-spot">
                    Spotting
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Each valid Biptiya sighting = 1 point. Scores accumulate through the calendar year.
                  </div>
                </div>
                <div className="rounded-2xl border bg-background/60 p-4">
                  <div className="font-medium" data-testid="text-rules-winner">
                    Winner
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Year-end crown goes to the highest score. If tied, whoever reached that final score first wins.
                  </div>
                </div>
                <div className="rounded-2xl border bg-background/60 p-4">
                  <div className="font-medium" data-testid="text-rules-ai">
                    Predictive AI
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    A fun estimate based on your current lead and your recent spotting pace. It updates after each spot.
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dive-in" className="mt-4">
              <div className="grid gap-4">
                <div className="rounded-2xl border bg-background/60 p-4" data-testid="panel-dive-in">
                  <div className="font-medium mb-4">
                    {format(NOW, "MMMM yyyy")} — Weekly Spottings
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyChartData}>
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Cutu" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Tamtam" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border bg-background/60 p-4" data-testid="panel-cutu-driving">
                  <div className="font-medium mb-4 flex items-center gap-2">
                    <Car className="size-4 text-[hsl(var(--primary))]" />
                    {format(NOW, "MMMM yyyy")} — Cutu Driving Stats
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-sm font-medium mb-2">{youName}</div>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData.cutu}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={50}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {pieChartData.cutu.map((entry, index) => (
                                <Cell key={`cell-cutu-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {pieChartData.cutu[0].value} / {pieChartData.cutuTotal} with Cutu driving
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium mb-2">{friendName}</div>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData.tamtam}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={50}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {pieChartData.tamtam.map((entry, index) => (
                                <Cell key={`cell-tamtam-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {pieChartData.tamtam[0].value} / {pieChartData.tamtamTotal} with Cutu driving
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
