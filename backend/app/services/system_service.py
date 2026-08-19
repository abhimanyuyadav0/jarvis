import os

import psutil


def get_stats() -> dict:
    """Read-only CPU, memory, and disk usage for the machine running this backend."""
    disk = psutil.disk_usage(os.path.abspath(os.sep))
    mem = psutil.virtual_memory()
    # On APFS (macOS), disk.percent is used/(used+free), not used/total — the
    # container reserves space for sibling volumes/snapshots that psutil counts
    # in `total` but not in `used` or `free`. Derive free/percent from
    # total - used instead, so the three numbers always add up consistently.
    disk_free_gb = round((disk.total - disk.used) / 1e9, 1)
    disk_percent = round(disk.used / disk.total * 100, 1) if disk.total else 0.0
    return {
        "cpu_percent": psutil.cpu_percent(interval=0.2),
        "memory": {
            "total_gb": round(mem.total / 1e9, 1),
            "used_gb": round(mem.used / 1e9, 1),
            "percent": mem.percent,
        },
        "disk": {
            "total_gb": round(disk.total / 1e9, 1),
            "used_gb": round(disk.used / 1e9, 1),
            "free_gb": disk_free_gb,
            "percent": disk_percent,
        },
    }
