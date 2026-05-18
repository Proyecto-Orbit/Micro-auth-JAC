import type { Request } from 'express';

export type AuthenticatedUser = {
	sub: string;
	username?: string;
	email?: string;
	roles: string[];
};

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
