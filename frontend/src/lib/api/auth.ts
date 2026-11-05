import { api } from "./client";

export type BackendUser = {
  id: string;
  email: string;
  name: string;
  role:
    | "super_admin"
    | "hr_admin"
    | "department_manager"
    | "employee";
  avatarUrl?: string;
  departmentId?: string;
  employeeId?: string;
  designation?: string;
  mustChangePassword?: boolean;
};

export type LoginResponse = {
  user: BackendUser;
};

export const authApi = {
  login: (email: string, password: string) =>
    api<LoginResponse>("/auth/login", {
      method: "POST",
      body: {
        email,
        password,
      },
    }),

  me: () =>
    api<{ user: BackendUser }>("/auth/me", {
      method: "GET",
    }),

  logout: () =>
    api<void>("/auth/logout", {
      method: "POST",
    }),
};