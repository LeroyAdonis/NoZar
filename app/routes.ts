import {
  type RouteConfig,
  index,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/landing.tsx"),
  route("dashboard", "routes/dashboard.tsx", [
    index("routes/dashboard/home.tsx"),
    route("asset/:id", "routes/dashboard/asset.$id.tsx"),
    route("pings", "routes/dashboard/pings.tsx"),
    route("pings/:id", "routes/dashboard/pings.$id.tsx"),
    route("map", "routes/dashboard/map.tsx"),
    route("add", "routes/dashboard/add.tsx"),
    route("profile", "routes/dashboard/profile.tsx"),
  ]),
  route("legal", "routes/legal.tsx", [
    route("terms", "routes/legal/terms.tsx"),
    route("privacy", "routes/legal/privacy.tsx"),
    route("community-guidelines", "routes/legal/community-guidelines.tsx"),
    route("complaints", "routes/legal/complaints.tsx"),
  ]),
] satisfies RouteConfig;
