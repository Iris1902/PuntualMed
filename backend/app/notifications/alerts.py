from typing import Any


async def send_missed_alerts(
    intake_repo: Any,
    contacts_repo: Any,
    telegram: Any,
) -> int:
    # Avisa a los familiares por cada toma vencida no notificada; idempotente via alert_sent.
    count = 0
    for intake in await intake_repo.list_unalerted_missed():
        time_text = intake.scheduled_at.strftime("%H:%M")
        med = intake.medication
        text = (
            f"PuntualMed: no se confirmo {med.name} {med.dose}"
            f" programada a las {time_text}."
        )
        for contact in await contacts_repo.list_by_user(intake.user_id):
            await telegram.send_message(contact.chat_id, text)
        await intake_repo.mark_alerted(intake)
        count += 1
    return count


async def poll_telegram_once(telegram: Any, service: Any, offset: int) -> int:
    updates = await telegram.get_updates(offset)
    next_offset = offset
    for update in updates:
        await service.handle_update(update)
        next_offset = max(next_offset, update.get("update_id", offset) + 1)
    return next_offset
