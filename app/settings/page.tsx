import { SettingsForm } from "@/components/settings-form";
import { ImportPanel } from "@/components/import-panel";
import { dataStatus, findUserById, getSettings } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const [user, settings, status] = await Promise.all([
    findUserById(session.id),
    getSettings(session.id),
    dataStatus(session.id),
  ]);
  if (!user) redirect("/login");
  const publicSettings = {
    ...settings,
    user_ai: {
      endpoint: settings.user_ai.endpoint ?? null,
      model: settings.user_ai.model ?? null,
      has_key: Boolean(settings.user_ai.api_key_enc),
    },
  };
  return (
    <div className="stack">
      <div className="page-head">
        <h1>设置</h1>
      </div>
      <SettingsForm
        settings={publicSettings as never}
        user={{ username: user.username, created_at: user.created_at }}
        status={status}
      />
      <section className="card">
        <h3>导入备份 / 表格</h3>
        <ImportPanel />
      </section>
    </div>
  );
}
