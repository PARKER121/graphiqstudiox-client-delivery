export type ProjectStatus = "paid" | "unpaid";

export interface ProjectRow {
  client_email: string;
  client_name: string;
  created_at: string;
  download_limit: number;
  downloads_used: number;
  file_url: string;
  id: string;
  preview_url: string;
  price: number;
  status: ProjectStatus;
  title: string;
  token: string;
}

export interface PaymentRow {
  amount: number;
  created_at: string;
  id: string;
  paystack_ref: string;
  project_id: string;
  status: string;
}

export interface AdminMonthlyStat {
  month: string;
  amount: number;
  clients: number;
}

export interface AdminStatistics {
  year: number;
  totalSales: number;
  totalClients: number;
  clientsThisMonth: number;
  monthlyStats: AdminMonthlyStat[];
}

export interface ProjectRecord {
  clientEmail: string;
  clientName: string;
  createdAt: string;
  downloadLimit: number;
  downloadsUsed: number;
  fileUrl: string;
  id: string;
  previewUrl: string;
  price: number;
  status: ProjectStatus;
  title: string;
  token: string;
}

export interface DeliverableReference {
  key: string;
  mode: "private" | "public-read";
  url: string;
}

export interface PublicProject {
  clientEmail: string;
  clientName: string;
  downloadLimit: number;
  downloadsUsed: number;
  previewUrl: string;
  price: number;
  status: ProjectStatus;
  title: string;
  token: string;
}

export interface SessionAdminUser {
  label: string;
}
