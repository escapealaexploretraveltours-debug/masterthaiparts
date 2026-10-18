// Paste your Supabase values here (Project Settings → API).
// The anon key is safe in the browser — Row Level Security protects the data.
// Leave both empty to run demo-only (data stays in the visitor's browser).
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";

// Usernames are stored in Supabase Auth as  <username>@<EMAIL_DOMAIN>
export const EMAIL_DOMAIN = "masterthaiparts.app";

export const SHOP = {
  name: "Master Thai Parts & Accessories",
  address: "Blk,17 Old Site Baseco Port Area Manila",
};

// Same six categories and page names as the original site.
export const CATEGORIES = [
  { key: "brake", title: "Braking System Parts", page: "brakeparts.html" },
  { key: "engine", title: "Engine Parts", page: "engineparts.html" },
  { key: "exhaust", title: "Exhaust Parts", page: "exhaustsystem.html" },
  { key: "fuel", title: "Fuel Parts", page: "fuels.html" },
  { key: "suspension", title: "Suspension Parts", page: "suspension.html" },
  { key: "transmission", title: "Transmission and Clutch Parts", page: "transmissionandclutch.html" },
];
