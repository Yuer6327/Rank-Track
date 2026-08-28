import { defaultSettings } from "@/lib/defaults";
import { fail, handleRouteError, json, readJson, requireUser } from "@/lib/api";
import { getSettings, upsertSettings } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { MAJOR_SUBJECTS, MINOR_SUBJECTS, type MinorSubject, type Settings } from "@/lib/types";

export async function GET() {
  try {
    const user = await requireUser();
    const settings = await getSettings(user.id);
    return json({ settings: publicSettings(settings) });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    const current = await getSettings(user.id);
    const body = await readJson<Partial<Settings> & { user_ai_api_key?: string | null }>(req);
    const minors = (body.enabled_minor_subjects ?? current.enabled_minor_subjects).filter((s) =>
      (MINOR_SUBJECTS as readonly string[]).includes(s),
    ) as MinorSubject[];
    if (minors.length !== 3) return fail(400, "小三门需恰好选择 3 门");
    const userAi = { ...current.user_ai };
    if (body.user_ai?.endpoint !== undefined) userAi.endpoint = body.user_ai.endpoint;
    if (body.user_ai?.model !== undefined) userAi.model = body.user_ai.model;
    if (body.user_ai_api_key === "") userAi.api_key_enc = null;
    else if (body.user_ai_api_key) userAi.api_key_enc = encryptSecret(body.user_ai_api_key);
    const next = defaultSettings(user.id, {
      ...current,
      ...body,
      enabled_minor_subjects: minors,
      subject_order: normalizeOrder(body.subject_order ?? current.subject_order, minors),
      user_ai: userAi,
    });
    await upsertSettings(next);
    return json({ settings: publicSettings(next) });
  } catch (err) {
    return handleRouteError(err);
  }
}

function normalizeOrder(order: Settings["subject_order"], minors: MinorSubject[]) {
  const allowed = new Set([...MAJOR_SUBJECTS, ...minors]);
  const seen = new Set<string>();
  const out: Settings["subject_order"] = [];
  for (const s of order) {
    if (allowed.has(s) && !seen.has(s)) {
      out.push(s);
      seen.add(s);
    }
  }
  for (const s of allowed) {
    if (!seen.has(s)) out.push(s);
  }
  return out;
}

function publicSettings(s: Settings) {
  return {
    ...s,
    user_ai: {
      endpoint: s.user_ai.endpoint ?? null,
      model: s.user_ai.model ?? null,
      has_key: Boolean(s.user_ai.api_key_enc),
    },
  };
}
