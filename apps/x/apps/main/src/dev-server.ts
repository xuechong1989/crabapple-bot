// Dev-mode renderer URL. Overridable so a second checkout (whose vite falls
// back to another port when 5173 is taken) can still be launched against its
// own renderer: CRABAPPLE_DEV_SERVER_URL=http://localhost:5174 electron .
export const DEV_SERVER_URL = process.env.CRABAPPLE_DEV_SERVER_URL ?? "http://localhost:5173";
