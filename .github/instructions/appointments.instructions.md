---
description: "Use when working on appointment lifecycle flows (complete, reschedule, cancel) or editing appointment.service.js so state transitions and patient-provided data are handled safely."
applyTo: "src/modules/appointments/**"
---
# Appointment Lifecycle Guidelines

- Allow status transitions only from pending, confirmed, checkedIn, or inProgress; reject any other starting states.
- Prefer Appointment model methods (cancel, reschedule, complete) to update status/history so built-in side effects stay consistent.
- Preserve existing patientProvidedInfo when updating; default attachments to [] and append with uploadedBy/uploadedAt metadata.
- Populate doctor/patient minimal fields before returning and run AppointmentHelpers.formatAppointmentResponse for outbound payloads.
- Keep request validation in appointment.validator.js aligned with controller/service expectations (e.g., appointmentId + visit metadata).
