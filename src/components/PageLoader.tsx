import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

type LoaderTask = {
  label: string;
  progress?: number;
  isComplete?: boolean;
};

type PageLoaderProps = {
  title: string;
  description?: string;
  tasks?: LoaderTask[];
};

export function PageLoader({ title, description, tasks = [] }: PageLoaderProps) {
  const normalizedTasks = tasks.length
    ? tasks
    : [{ label: "Loading dataset", progress: 0, isComplete: false }];

  const progressSum = normalizedTasks.reduce((sum, task) => {
    if (typeof task.progress === "number") {
      return sum + Math.min(100, Math.max(0, task.progress));
    }
    return sum + (task.isComplete ? 100 : 0);
  }, 0);

  const percentage = Math.round(progressSum / normalizedTasks.length);

  return (
    <div className="relative isolate flex min-h-[60vh] items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-white to-secondary/10" />
      <div className="absolute -left-10 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-10 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" />

      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border bg-white/80 shadow-xl backdrop-blur">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.1),transparent_25%)]" />
        <div className="relative space-y-6 p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Loading</p>
              <h2 className="text-2xl font-semibold leading-tight">{title}</h2>
              {description && <p className="text-muted-foreground">{description}</p>}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border bg-white/60 p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Preparing data, please wait</span>
              <span className="font-semibold text-foreground">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-3" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {normalizedTasks.map((task, index) => {
              const value = Math.round(
                task.progress ?? (task.isComplete ? 100 : 0)
              );
              const isDone = value >= 100;

              return (
                <div
                  key={`${task.label}-${index}`}
                  className="flex items-center gap-3 rounded-2xl border bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm"
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      isDone ? "bg-emerald-50 text-emerald-600" : "bg-primary/10 text-primary"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium leading-tight">{task.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {isDone ? "Done" : "Syncing…"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">{value}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { LoaderTask as PageLoaderTask };
