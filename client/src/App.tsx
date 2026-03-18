import { Switch, Route, Link, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import HistoryPage from "@/pages/history";
import logoImg from "@/assets/images/logo.png";

function TopNav() {
  const [location] = useLocation();

  const items = [
    { href: "/", label: "Dashboard" },
    { href: "/history", label: "History" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="Biptiya Spotter Logo"
            className="size-9 rounded-xl object-cover"
          />
          <div className="leading-tight">
            <div className="font-serif text-[15px] tracking-tight">
              Biptiya Spotter
            </div>
            <div className="text-xs text-muted-foreground">Two hunters. One crown.</div>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-full border bg-card/70 p-1 shadow-sm">
          {items.map((it) => {
            const active = location === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                data-testid={`link-nav-${it.href === "/" ? "dashboard" : "history"}`}
                className={
                  "rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-muted " +
                  (active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground")
                }
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/history" component={HistoryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="min-h-dvh app-bg">
          <TopNav />
          <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
            <Router />
          </main>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
