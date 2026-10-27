export type Role = "ADMIN" | "EDITOR" | "PLAYER";

export function isRole(value: string): value is Role {
    return value === "ADMIN" || value === "EDITOR" || value === "PLAYER";
}
