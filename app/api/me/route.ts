import { handleRouteError, json, requireUser } from "@/lib/api";
import { dataStatus, findUserById, getSettings } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const [profile, settings, status] = await Promise.all([
      findUserById(user.id),
      getSettings(user.id),
      dataStatus(user.id),
    ]);
    return json({ user: profile, settings, status });
  } catch (err) {
    return handleRouteError(err);
  }
}
