// Klokd v3 — shared rail error-status mapping.
//
// Rail clients previously collapsed every non-401 upstream failure to 502,
// which made a non-retryable `422` (e.g. Identiti `kyc_iprs_no_match`, a
// validation-class rejection) indistinguishable from a genuinely retryable
// `502` (e.g. `upstream_iprs_unavailable`) at the status level. Retry logic
// cannot make a correct decision from a flattened status.
//
// Mapping:
//   4xx  -> preserved verbatim. The rail is telling us the REQUEST was wrong;
//           the caller needs the specific class (400 malformed, 404 missing,
//           409 conflict/terminal, 422 unprocessable) to decide whether to
//           surface, branch, or give up. None of these are retryable as-is.
//   5xx  -> 502 Bad Gateway. The failure is in the upstream hop, not in Klokd.
//           These ARE candidates for retry with backoff.
//
// Callers should still branch on `AppError.railCode` for exact semantics; the
// status is the coarse retryable/not-retryable signal.
export function railStatusToAppStatus(upstreamStatus: number): number {
  if (upstreamStatus >= 400 && upstreamStatus < 500) return upstreamStatus;
  return 502;
}
