import NextAuth from "next-auth";
import { Role } from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      avatar?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    avatar?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    avatar?: string;
  }
}
