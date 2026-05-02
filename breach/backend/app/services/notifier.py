import os
from typing import Dict, List
import aiosmtplib
from email.mime import text as MimeText

class EmailNotifier:
    def __init__(self):
        self.from_address = os.getenv("NOTIFY_FROM", "BreachAlert <rahilxox@gmail.com>")
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", 587))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_pass = os.getenv("SMTP_PASS")

    async def send_verification(self, email: str, token: str) -> None:
        subject = "Confirm your BreachAlert subscription"
        body = f"""
Welcome to BreachAlert!

Please confirm your watch subscription for {email}.
Click the verification link below:
http://localhost:5173/verify?email={email}&token={token}

If you did not request this, ignore this message.

Best,
BreachAlert Team
        """
        await self._send(email, subject, body)

    async def send_breach_alert(self, email: str, breach_data: Dict) -> None:
        advice = self._actionable_advice(breach_data.get("DataClasses", []))
        subject = f"BreachAlert: New exposure detected for {email}"
        body = f"""
We detected a new breach affecting {email}.

Breach: {breach_data.get('Name')}
Date: {breach_data.get('BreachDate')}
Exposed data: {', '.join(breach_data.get('DataClasses', []))}

Advice:
{advice}

Visit your BreachAlert dashboard for full details.

Best,
BreachAlert Team
        """
        await self._send(email, subject, body)

    def _actionable_advice(self, data_classes: List[str]) -> str:
        advice = []
        if any("password" in item.lower() for item in data_classes):
            advice.append("• Change your passwords immediately and use a password manager.")
        if any("credit" in item.lower() for item in data_classes):
            advice.append("• Place a fraud alert with your bank and monitor credit reports.")
        if any("phone" in item.lower() for item in data_classes):
            advice.append("• Expect scam calls and do not share personal details over the phone.")
        if not advice:
            advice.append("• Review the exposed account and update security settings.")
        return "\n".join(advice)

    async def _send(self, to_email: str, subject: str, body: str) -> None:
        if not self.smtp_user or not self.smtp_pass:
            print(f"[SMTP Disabled] To: {to_email} | Subject: {subject}")
            return

        msg = MimeText(body)
        msg['Subject'] = subject
        msg['From'] = self.from_address
        msg['To'] = to_email

        try:
            async with aiosmtplib.SMTP(hostname=self.smtp_host, port=self.smtp_port) as smtp:
                await smtp.starttls()
                await smtp.login(self.smtp_user, self.smtp_pass)
                await smtp.send_message(msg)
                print(f"[SMTP SUCCESS] Sent to {to_email}")
        except Exception as e:
            print(f"[SMTP ERROR] {e}")

