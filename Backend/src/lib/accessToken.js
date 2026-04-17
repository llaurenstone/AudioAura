export function getAccessToken(req) {
  const headerToken = req.get("x-audioaura-auth");
  if (headerToken) {
    return headerToken;
  }

  return req.session?.accessToken ?? null;
}

