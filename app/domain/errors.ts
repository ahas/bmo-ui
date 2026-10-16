// What the server put in the failed response, or the caller's own wording when it said nothing.
export function failureText(error: unknown, fallback: string): string {
  const body = (error as { data?: { message?: unknown } } | null)?.data;

  return typeof body?.message === "string" && body.message !== "" ? body.message : fallback;
}

// Whether a call failed only by answering late: the far side took it and did not answer in time,
// which a gateway says with a 504. What was asked may well be done.
export function answeredLate(error: unknown): boolean {
  return (error as { statusCode?: unknown } | null)?.statusCode === 504;
}
