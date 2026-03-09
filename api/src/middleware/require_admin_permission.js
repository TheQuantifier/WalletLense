const ROLE_PERMISSIONS = {
  admin: new Set([
    "users.read",
    "users.write",
    "records.read",
    "records.write",
    "settings.read",
    "settings.write",
    "notifications.read",
    "notifications.write",
    "support.read",
    "support.write",
    "audit.read",
    "health.read",
    "data_safety.read",
    "data_safety.write",
  ]),
  support_admin: new Set([
    "users.read",
    "notifications.read",
    "notifications.write",
    "support.read",
    "support.write",
    "audit.read",
    "health.read",
  ]),
  analyst: new Set([
    "users.read",
    "records.read",
    "notifications.read",
    "support.read",
    "audit.read",
    "health.read",
    "data_safety.read",
  ]),
};

export default function requireAdminPermission(permission) {
  return function requirePermission(req, res, next) {
    const role = String(req.user?.role || "").trim();
    const allowed = ROLE_PERMISSIONS[role];
    if (!allowed || !allowed.has(permission)) {
      return res.status(403).json({ message: "Permission denied" });
    }
    return next();
  };
}
