export const MOODLE_TOKEN_COOKIE = "moodleToken";
export const BACKEND_TOKEN_COOKIE = "auth_token";

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

