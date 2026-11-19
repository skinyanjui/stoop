# Stoop Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Baseline**: Every unspecified document path is denied for read and write.
2. **PII Isolation**: Private user data (`users/{userId}` containing `email`, `savedIds`, `payments`, `listingOrder`) is strictly readable and writable only by the authenticated owner (`request.auth.uid == userId`). `list` queries on `/users` are completely blocked.
3. **Public Listings Integrity**: Public `sales/{saleId}` listings contain zero user account PII (`email` or `phone`), require `status == 'active'` on reads/lists, and require `email_verified == true` for all creates, updates, and deletes.
4. **Ownership & Immutability**: `ownerUid` on `/sales/{saleId}` and `uid` on `/users/{userId}` must equal `request.auth.uid` on creation and cannot be reassigned on update. `createdAt` must equal `request.time` on creation and cannot change on update. `updatedAt` must equal `request.time` on every write.
5. **Bounded Payloads & Key Whitelisting**: Both `User` and `Sale` reject unknown ghost fields via strict `hasAll` + `hasOnly` on write and `affectedKeys().hasOnly(...)` on update, with explicit `.size()` bounds on all strings, maps, and arrays.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Create Sale**: `auth: null`, create `/sales/s_hack` -> `PERMISSION_DENIED`.
2. **Unverified Email Create Sale**: `auth: { uid: 'u1', token: { email_verified: false } }`, create `/sales/s1` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on Create**: `auth: { uid: 'u1', token: { email_verified: true } }`, create `/sales/s1` with `ownerUid: 'victim'` -> `PERMISSION_DENIED`.
4. **Ghost Field Injection ("Shadow Write")**: Valid sale payload plus `{ isFeatured: true }` or `{ role: 'admin' }` -> `PERMISSION_DENIED`.
5. **Cross-User Sale Update**: User `u2` attempts to update `/sales/s1` owned by `u1` -> `PERMISSION_DENIED`.
6. **Cross-User Sale Delete**: User `u2` attempts to delete `/sales/s1` owned by `u1` -> `PERMISSION_DENIED`.
7. **Owner Reassignment on Update**: Owner `u1` attempts `{ ownerUid: 'u2', updatedAt: request.time }` -> `PERMISSION_DENIED`.
8. **Timestamp Forgery**: Create with `createdAt: Timestamp(2020-01-01)` instead of `request.time` -> `PERMISSION_DENIED`.
9. **ID Poisoning**: Create/Get `/sales/invalid$id!123` or 200-char ID -> `PERMISSION_DENIED`.
10. **Payload Size Exhaustion ("Denial of Wallet")**: Sale `desc` > 2000 chars or `photos` > 4 items or `photos[0]` > 200KB -> `PERMISSION_DENIED`.
11. **PII Read Leak**: User `u2` attempts `get(/users/u1)` or `list(/users)` -> `PERMISSION_DENIED`.
12. **User Privilege Escalation**: User `u1` attempts `create` or `update` on `/users/u1` with `{ isAdmin: true }` -> `PERMISSION_DENIED`.
