export function GET(): Response {
  return Response.json(
    { status: "ok" },
    { headers: { "X-Robots-Tag": "noindex, nofollow" } },
  );
}
