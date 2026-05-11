import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase";
import { deleteDeliverableFile, parseDeliverableReference } from "@/lib/uploadthing";
import type {
  AdminStatistics,
  PaymentRow,
  ProjectRecord,
  ProjectRow,
  PublicProject,
} from "@/lib/types";

interface CreateProjectInput {
  clientEmail: string;
  clientName: string;
  downloadLimit: number;
  fileUrl: string;
  previewUrl: string;
  price: number;
  title: string;
  token: string;
}

interface MarkPaidInput {
  amount: number;
  paystackRef: string;
  status: string;
  token: string;
}

export function isSupabaseTableMissingError(
  error: unknown,
  tableName: "payments" | "projects",
) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const qualifiedName = `public.${tableName}`;

  return (
    message.includes(qualifiedName) &&
    (message.includes("schema cache") || message.includes("does not exist"))
  );
}

function mapProjectRow(row: ProjectRow): ProjectRecord {
  return {
    clientEmail: row.client_email,
    clientName: row.client_name,
    createdAt: row.created_at,
    downloadLimit: row.download_limit,
    downloadsUsed: row.downloads_used,
    fileUrl: row.file_url,
    id: row.id,
    previewUrl: row.preview_url,
    price: row.price,
    status: row.status,
    title: row.title,
    token: row.token,
  };
}

const PROJECT_EXPIRATION_DAYS = 5;
const PROJECT_EXPIRATION_MS = PROJECT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

async function cleanupExpiredProjects() {
  const supabase = getSupabaseAdmin();
  const expirationThreshold = new Date(Date.now() - PROJECT_EXPIRATION_MS).toISOString();

  const { data: expiredProjects, error } = await supabase
    .from("projects")
    .select("id")
    .lt("created_at", expirationThreshold)
    .returns<Pick<ProjectRow, "id">[]>();

  if (error) {
    throw new Error(error.message);
  }

  if (!expiredProjects?.length) {
    return;
  }

  await Promise.all(
    expiredProjects.map(async (project) => {
      try {
        await deleteProjectById(project.id);
      } catch {
        // Best-effort cleanup: keep removing other expired records.
      }
    }),
  );
}

function formatMonthLabel(index: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(new Date(Date.UTC(2020, index, 1)));
}

export async function getAdminStatistics(
  year = new Date().getUTCFullYear(),
): Promise<AdminStatistics> {
  const supabase = getSupabaseAdmin();
  const startOfYear = new Date(Date.UTC(year, 0, 1)).toISOString();
  const startOfNextYear = new Date(Date.UTC(year + 1, 0, 1)).toISOString();

  const { data: payments, error } = await supabase
    .from("payments")
    .select("project_id, amount, created_at")
    .eq("status", "success")
    .gte("created_at", startOfYear)
    .lt("created_at", startOfNextYear)
    .returns<{ project_id: string; amount: number; created_at: string }[]>();

  if (error) {
    throw new Error(error.message);
  }

  const monthlyStats: Array<{
    month: string;
    amount: number;
    clients: Set<string>;
  }> = Array.from({ length: 12 }, (_, index) => ({
    month: formatMonthLabel(index),
    amount: 0,
    clients: new Set<string>(),
  }));

  const totalClients = new Set<string>();
  let totalSales = 0;

  for (const payment of payments ?? []) {
    const paidAt = new Date(payment.created_at);
    const monthIndex = paidAt.getUTCMonth();

    monthlyStats[monthIndex].amount += payment.amount;
    monthlyStats[monthIndex].clients.add(payment.project_id);
    totalClients.add(payment.project_id);
    totalSales += payment.amount;
  }

  const currentYear = new Date().getUTCFullYear();
  const currentMonthIndex = new Date().getUTCMonth();

  return {
    year,
    totalSales,
    totalClients: totalClients.size,
    clientsThisMonth:
      year === currentYear ? monthlyStats[currentMonthIndex].clients.size : 0,
    monthlyStats: monthlyStats.map(({ month, amount, clients }) => ({
      month,
      amount,
      clients: clients.size,
    })),
  };
}

export async function deleteProjectsByYear(year: number) {
  const supabase = getSupabaseAdmin();
  const startOfYear = new Date(Date.UTC(year, 0, 1)).toISOString();
  const startOfNextYear = new Date(Date.UTC(year + 1, 0, 1)).toISOString();

  const { error } = await supabase
    .from("projects")
    .delete()
    .gte("created_at", startOfYear)
    .lt("created_at", startOfNextYear);

  if (error) {
    throw new Error(error.message);
  }
}

function mapPublicProject(row: ProjectRow): PublicProject {
  return {
    clientEmail: row.client_email,
    clientName: row.client_name,
    downloadLimit: row.download_limit,
    downloadsUsed: row.downloads_used,
    previewUrl: row.preview_url,
    price: row.price,
    status: row.status,
    title: row.title,
    token: row.token,
  };
}

export async function getProjectByToken(token: string) {
  await cleanupExpiredProjects();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("token", token)
    .maybeSingle<ProjectRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapProjectRow(data) : null;
}

export async function getPublicProjectByToken(token: string) {
  await cleanupExpiredProjects();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("token", token)
    .maybeSingle<ProjectRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapPublicProject(data) : null;
}

export async function listProjects() {
  await cleanupExpiredProjects();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<ProjectRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapProjectRow);
}

export async function createProject(input: CreateProjectInput) {
  const supabase = getSupabaseAdmin();
  const downloadLimit = Math.min(Math.max(input.downloadLimit, 1), 3);
  const { data, error } = await supabase
    .from("projects")
    .insert({
      client_email: input.clientEmail,
      client_name: input.clientName,
      download_limit: downloadLimit,
      downloads_used: 0,
      file_url: input.fileUrl,
      preview_url: input.previewUrl,
      price: input.price,
      status: "unpaid",
      title: input.title,
      token: input.token,
    })
    .select("*")
    .single<ProjectRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create project.");
  }

  return mapProjectRow(data);
}

export async function deleteProjectById(id: string) {
  const supabase = getSupabaseAdmin();
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle<ProjectRow>();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const deliverable = parseDeliverableReference(project.file_url);
  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  try {
    await deleteDeliverableFile(deliverable);
  } catch {
    // Best-effort cleanup for remote assets after the project link is removed.
  }

  return mapProjectRow(project);
}

export async function markProjectPaidFromWebhook(input: MarkPaidInput) {
  await cleanupExpiredProjects();

  const supabase = getSupabaseAdmin();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("token", input.token)
    .maybeSingle<ProjectRow>();

  if (projectError) {
    throw new Error(projectError.message);
  }

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  if (project.price !== input.amount) {
    throw new Error("AMOUNT_MISMATCH");
  }

  const paymentInsert = await supabase.from("payments").upsert(
    {
      amount: input.amount,
      paystack_ref: input.paystackRef,
      project_id: project.id,
      status: input.status,
    },
    {
      ignoreDuplicates: true,
      onConflict: "paystack_ref",
    },
  );

  if (paymentInsert.error) {
    throw new Error(paymentInsert.error.message);
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      status: "paid",
    })
    .eq("id", project.id);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

async function hasVerifiedPayment(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payments")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "success")
    .limit(1)
    .returns<Pick<PaymentRow, "id">[]>();

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) && data.length > 0;
}

export async function claimProjectDownload(token: string) {
  const project = await getProjectByToken(token);

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  if (project.status !== "paid") {
    throw new Error("PROJECT_UNPAID");
  }

  const paymentVerified = await hasVerifiedPayment(project.id);

  if (!paymentVerified) {
    throw new Error("PROJECT_UNPAID");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .update({
      downloads_used: project.downloadsUsed + 1,
    })
    .eq("id", project.id)
    .eq("status", "paid")
    .lt("downloads_used", project.downloadLimit)
    .select("*")
    .maybeSingle<ProjectRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("DOWNLOAD_LIMIT_REACHED");
  }

  return {
    deliverable: parseDeliverableReference(project.fileUrl),
  };
}
