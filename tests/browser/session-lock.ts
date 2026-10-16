import { closeSync, openSync } from "node:fs";

// A lock on a file, held for as long as a browser session wants it rather than for the whole life
// of the process. The holder is flock(1) keeping a pipe open: the lock is the same flock(2) lock
// every `flock <file> <command>` takes, so it excludes those runs as much as another session, and
// it goes the moment the pipe closes — on release, or when this process dies without releasing.
//
// A taker that finds the lock held looks again every half second until its wait runs out. Waiters
// are not queued: whichever looks first once the holder lets go takes it, which is fair enough
// for the handful of browser files a suite runs.

export interface HeldLock {
  release: () => Promise<void>;
}

// How often a waiting taker looks whether the lock has come free.
const POLL_MS = 500;

/** The lock, or null when it could not be had within the wait. */
export async function takeLock(path: string, waitSeconds: number): Promise<HeldLock | null> {
  closeSync(openSync(path, "a"));

  const deadline = Date.now() + Math.max(0, waitSeconds) * 1000;

  for (;;) {
    const holder = await tryHolding(path);

    if (holder !== null) return holding(holder);

    if (Date.now() >= deadline) return null;

    await Bun.sleep(Math.min(POLL_MS, Math.max(0, deadline - Date.now())));
  }
}

// The lock taken without waiting: the flock process keeping it, or null where another holds it.
async function tryHolding(path: string): Promise<Bun.Subprocess<"pipe", "pipe", "ignore"> | null> {
  const holder = Bun.spawn(["flock", "-n", path, "sh", "-c", "echo held; exec cat > /dev/null"], { stdin: "pipe", stdout: "pipe", stderr: "ignore" });
  const reader = holder.stdout.getReader();
  let said = "";

  while (!said.includes("\n")) {
    const { value, done } = await reader.read();

    if (done) break;

    said += new TextDecoder().decode(value);
  }

  reader.releaseLock();

  if (said.startsWith("held")) return holder;

  await holder.exited;

  return null;
}

// The lock as its taker holds it: the flock process kept open until it is let go.
function holding(holder: Bun.Subprocess<"pipe", "pipe", "ignore">): HeldLock {
  let released = false;

  return {
    release: async () => {
      if (released) {
        return;
      }

      released = true;
      await holder.stdin.end();
      await holder.exited;
    },
  };
}
