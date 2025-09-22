import { ulid } from 'ulid';
export const gid = () => `G_${ulid()}`;
export const cid = () => `C_${ulid()}`;
export const aid = () => `A_${ulid()}`;
export const rid = () => `R_${ulid()}`;
export const nowIso = () => new Date().toISOString();
