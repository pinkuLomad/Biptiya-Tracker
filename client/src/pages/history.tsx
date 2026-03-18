import { useMemo, useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Crown, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type PlayerId = "A" | "B";

type Spot = {
  id: string;
  player: PlayerId;
  at: number;
  aScoreAfter: number;
  bScoreAfter: number;
};

type YearRecord = {
  year: number;
  winner: PlayerId;
  finalA: number;
  finalB: number;
  completedAt: number;
  spots: Spot[];
};

function makeYear(year: number, winner: PlayerId, finalA: number, finalB: number): YearRecord {
  const start = new Date(year, 0, 2, 10, 0, 0).getTime();
  const spots: Spot[] = [];
  let a = 0;
  let b = 0;

  const total = finalA + finalB;
  for (let i = 0; i < total; i += 1) {
    const p: PlayerId = a < finalA && b < finalB ? (Math.random() > 0.5 ? "A" : "B") : a < finalA ? "A" : "B";
    if (p === "A") a += 1;
    if (p === "B") b += 1;
    spots.push({
      id: `${year}-${i}-${p}`,
      player: p,
      at: start + i * 1000 * 60 * 60 * 24 * 2,
      aScoreAfter: a,
      bScoreAfter: b,
    });
  }

  const completedAt = new Date(year, 11, 31, 23, 59, 59).getTime();
  return { year, winner, finalA, finalB, completedAt, spots };
}

function HistoryHome({ years }: { years: YearRecord[] }) {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight" data-testid="text-history-title">
            History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground" data-testid="text-history-subtitle">
            Past seasons, final scores, and the crowned Biptiya King/Queen.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {years.map((y) => (
          <Link
            key={y.year}
            href={`/history/${y.year}`}
            data-testid={`card-year-${y.year}`}
            className="block"
          >
            <Card className="soft-ring leopard-sheen border p-5 transition-transform hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-serif text-2xl" data-testid={`text-year-${y.year}`}>
                      {y.year}
                    </div>
                    <Badge className="rounded-full" data-testid={`badge-winner-${y.year}`}>
                      Winner: {y.winner === "A" ? "Cutu" : "Tamtam"}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground" data-testid={`text-final-${y.year}`}>
                    Final: Cutu {y.finalA} • Tamtam {y.finalB}
                  </div>
                </div>
                <Trophy className="size-5 text-[hsl(var(--primary))]" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function YearDetail({ years }: { years: YearRecord[] }) {
  const [location, setLocation] = useLocation();
  const year = Number(location.split("/").pop());

  const record = years.find((y) => y.year === year);

  if (!record) {
    return (
      <div className="rounded-2xl border bg-muted/30 p-4" data-testid="empty-year">
        Year not found.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setLocation("/history")}
          data-testid="button-back-history"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>

        <Badge variant="secondary" className="rounded-full" data-testid="badge-year-detail">
          Completed {format(new Date(record.completedAt), "MMM d, yyyy")}
        </Badge>
      </div>

      <Card className="soft-ring border p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="size-4 text-[hsl(var(--primary))]" />
              <h1 className="font-serif text-3xl tracking-tight" data-testid="text-year-detail-title">
                {record.year}
              </h1>
              <Badge className="rounded-full" data-testid="badge-year-winner">
                Biptiya {record.winner === "A" ? "Queen" : "King"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="text-year-detail-subtitle">
              Final score: Cutu {record.finalA} vs Tamtam {record.finalB}
            </p>
          </div>

          <div className="rounded-2xl border bg-background/60 px-4 py-3">
            <div className="text-xs text-muted-foreground">Tiebreaker</div>
            <div className="text-sm">Reached final score first</div>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-2">
          {record.spots.slice(0, 40).map((s, idx) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-2xl border bg-background/60 p-3"
              data-testid={`row-year-spot-${idx}`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={
                    "size-2.5 rounded-full " +
                    (s.player === "A"
                      ? "bg-[hsl(var(--primary))]"
                      : "bg-[hsl(var(--accent))]")
                  }
                  aria-hidden="true"
                />
                <div className="text-sm" data-testid={`text-year-spot-player-${idx}`}>
                  {s.player === "A" ? "Cutu" : "Tamtam"}
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full"
                  data-testid={`badge-year-spot-score-${idx}`}
                >
                  {s.aScoreAfter}-{s.bScoreAfter}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground" data-testid={`text-year-spot-time-${idx}`}>
                {format(new Date(s.at), "MMM d")}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs text-muted-foreground" data-testid="text-year-detail-note">
          Showing the first 40 spots for this year (mock data for now).
        </div>
      </Card>
    </div>
  );
}

export default function HistoryPage() {
  const [years] = useState<YearRecord[]>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    return [
      makeYear(currentYear - 1, "A", 22, 7),
     
    ];
  });

  const sorted = useMemo(() => [...years].sort((a, b) => b.year - a.year), [years]);

  return (
    <Switch>
      <Route path="/history" component={() => <HistoryHome years={sorted} />} />
      <Route path="/history/:year" component={() => <YearDetail years={sorted} />} />
    </Switch>
  );
}
