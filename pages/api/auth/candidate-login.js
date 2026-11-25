import candidates from "../../../data/candidates.json";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.toString().trim();

  // 1. Check if it's an administrator email
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin = adminEmails.includes(cleanEmail) || cleanEmail.startsWith("admin@");
  const adminPassword = (process.env.ADMIN_PASSWORD || "FD240387").trim();

  if (isAdmin) {
    if (cleanPass !== adminPassword) {
      return res.status(401).json({
        authorized: false,
        error: "Access Denied: Invalid administrator password.",
      });
    }
    return res.status(200).json({
      authorized: true,
      candidate: {
        email: cleanEmail,
        username: cleanEmail.split("@")[0],
        roleNumber: "ADMIN",
        isAdmin: true,
      },
    });
  }

  // 2. Check candidate roster
  const candidateMatch = candidates.find(
    (c) => c.email.toLowerCase() === cleanEmail && c.password.toString().trim() === cleanPass
  );

  if (!candidateMatch) {
    return res.status(401).json({
      authorized: false,
      error: "Access Denied: Email or password does not match the authorized candidate roster.",
    });
  }

  return res.status(200).json({
    authorized: true,
    candidate: candidateMatch,
  });
}
