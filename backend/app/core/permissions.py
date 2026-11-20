"""Role-based access control (RBAC) permission system."""

ROLE_PERMISSIONS = {
    "admin": ["*"],  # all permissions
    "manager": [
        "read:events",
        "read:analytics",
        "read:reports",
        "create:reports",
        "read:masters",
        "write:masters",
    ],
    "engineer": [
        "read:events",
        "write:events",
        "read:analytics",
        "read:masters",
    ],
    "supervisor": [
        "read:events",
        "write:events",
        "read:analytics",
    ],
    "analyst": [
        "read:events",
        "read:analytics",
        "read:reports",
        "create:reports",
        "write:imports",
    ],
}


def has_permission(role: str, required: str) -> bool:
    """
    Check if a role has the required permission.

    Args:
        role: User role
        required: Required permission string

    Returns:
        True if role has permission, False otherwise
    """
    perms = ROLE_PERMISSIONS.get(role, [])
    return "*" in perms or required in perms
