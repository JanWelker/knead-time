from dataclasses import dataclass, field


@dataclass
class Metrics:
    """Prometheus text exposition, hand-rolled: three counters and a gauge need no library."""

    sent: int = 0
    failed: int = 0
    gone: int = 0
    limited: int = 0
    subscriptions: int = 0
    _help: dict[str, str] = field(
        default_factory=lambda: {
            "sent": "Reminders delivered to a push service",
            "failed": "Sends that failed and will be retried or given up on",
            "gone": "Subscriptions deleted because the push service refused them",
            "limited": "Requests refused by the per-address rate limit",
        }
    )

    def render(self) -> str:
        lines = []
        for name in ("sent", "failed", "gone", "limited"):
            lines.append(f"# HELP kneadtime_push_{name}_total {self._help[name]}")
            lines.append(f"# TYPE kneadtime_push_{name}_total counter")
            lines.append(f"kneadtime_push_{name}_total {getattr(self, name)}")
        lines.append("# HELP kneadtime_push_subscriptions Subscriptions currently stored")
        lines.append("# TYPE kneadtime_push_subscriptions gauge")
        lines.append(f"kneadtime_push_subscriptions {self.subscriptions}")
        return "\n".join(lines) + "\n"
