import type { Request } from "express";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgMember {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Date;
}

export interface FullOrganization {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: string | null;
  members?: OrgMember[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  organization: FullOrganization;
  member: OrgMember;
  previewMode?: boolean;
}
