import sql from "@/lib/db";
import { jsonOk } from "@/lib/utils";

export async function GET() {
  return jsonOk({
    status: "healthy",
    version: "3.0.0",
    environment: process.env.APP_ENV || "development",
    uptime: process.uptime(),
  });
}
