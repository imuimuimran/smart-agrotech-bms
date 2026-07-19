import env from "../../config/env.js";

import {
  AUTH_COOKIE_OPTIONS,
} from "./auth.constants.js";

export const getAccessTokenCookieOptions = () => ({
  ...AUTH_COOKIE_OPTIONS,

  secure: env.cookieSecure,

  maxAge:
    env.cookieExpiresIn *
    24 *
    60 *
    60 *
    1000,
});