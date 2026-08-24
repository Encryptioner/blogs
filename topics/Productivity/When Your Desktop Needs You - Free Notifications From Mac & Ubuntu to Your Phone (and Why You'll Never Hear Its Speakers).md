# When Your Desktop Needs You — Free Notifications From Mac & Ubuntu to Your Phone (and Why You'll Never Hear Its Speakers)

> The phone already controls the desk. The missing half is the desk tapping you back — without you holding a VNC session open all day to find out.

[Your Desk in Your Pocket](./Your%20Desk%20in%20Your%20Pocket%20-%20Free%20Remote%20Control%20for%20Mac%20%26%20Ubuntu%2C%20Same%20Room%20or%20Anywhere%20on%20Earth.md) built one arrow: the phone drives the Mac and the Ubuntu box from the couch or from another city. But every scenario in that post starts the same way — *you* open the app, *you* look. The reverse arrow never existed. So this happens:

A build's been running for twenty minutes. An agent is mid-task and waiting on your "looks good." A backup job either succeeded at 2 a.m. or didn't. Your phone is in your pocket the whole time, perfectly capable of making a sound — and it stays silent, because the desktop has no way to reach it. You poll. You unlock the phone, open the VNC app, squint at a terminal, close it. Twenty minutes later, again. That's not remote control; that's a watchman's shift.

This post fixes exactly that. Two paths, one tool — **[ntfy](https://ntfy.sh/)**, an open-source notification service that speaks plain HTTP:

- **Path A — Mac, zero setup.** `curl` (already installed) publishes to ntfy.sh's free server. Phone subscribes. Works in 30 seconds, same WiFi or cellular. No server, no Docker, no account.
- **Path C — Ubuntu, full auto.** A D-Bus script intercepts *every* desktop notification — Slack, email, system alerts, build agents — and forwards them all to your phone automatically. Self-hosted on your tailnet. Nothing leaves your machines.

Both paths are free. Both work over Tailscale (same room or another city). One sentence makes the whole thing work: **don't ship the sound, ship the sentence.** The phone's notification system makes sounds natively, for free, better than any audio stream would.

## Topic flow

```
PATH A — MAC (30 seconds)                PATH B — UBUNTU (full auto)
─────────────────────────────            ─────────────────────────────
Phone subscribes to ntfy.sh              Intercept ALL desktop notifications
Mac publishes with curl                  D-Bus script + ntfy forward
Works everywhere — no server needed      Self-hosted on your tailnet
                                         Agent + build + cron wiring
                                         Reference — troubleshooting
                                         & security
─────────────────────────────            ─────────────────────────────
      Start here if you're on Mac.       Ubuntu box? This is the prize.
      30 seconds to first buzz.          Every notification, auto-mirrored.
```

## What it actually looks like

- **A build finishes.** Phone buzzes. You glance, you decide — open the VNC app and act, or keep resting. The desk waited politely instead of being polled.
- **An agent needs your nudge.** "Tests pass; awaiting approval" arrives as a notification. The B-26 rig handles the reply; this post handles the *summons*.
- **The 2 a.m. backup failed.** You find out at 2:00:01, not when you happen to log in Tuesday. `systemd` fires the same one-line curl.
- **Slack pings you on the desktop.** On Ubuntu, you see it on your phone too — automatically, without configuring anything per-app.
- **You're on cellular, another city.** Same buzz, same second — because the message rides the same tailnet B-26 already built.
- **Nothing new to babysit.** No account, no monthly anything, no third-party cloud holding your messages — the notification server is your own Ubuntu box.

---

# Path A — Mac: 30 seconds to first buzz

No server. No Docker. No apt. The Mac publishes, the phone subscribes, ntfy.sh carries the message. This is the path to try first.

## Why Mac can't do full auto (and why that's fine)

macOS has no public API to read other apps' notifications. An Apple DTS engineer confirmed it: the push/local notification system *"does not provide an API for managing or observing other applications' notification data"* ([Apple Developer Forums](https://forums.developer.apple.com/forums/thread/758451)). There are hacky workarounds using the Accessibility API ([macos-notification-cli](https://github.com/coryfklein/macos-notification-cli)), but they require Accessibility permission, break across macOS releases, and can't watch for new notifications in real time.

So Mac gets the manual path: you publish when something happens. It's one `curl` — and for build alerts, backup results, and agent status, that's the right level of automation anyway.

## Phone — subscribe (30 seconds, once)

1. Install the **ntfy app** — [Play Store](https://play.google.com/store/apps/details?id=io.heckel.ntfy) or [F-Droid](https://f-droid.org/en/packages/io.heckel.ntfy/) (the F-Droid build has no Google-services dependency at all).
2. Tap **+** → type `https://ntfy.sh/your-unguessable-topic-name`. Replace `your-unguessable-topic-name` with something random — **the topic name is the password**.
3. Done. The app subscribes. You'll see a "Connected" status.

**iOS users:** the same app works on iPhone ([App Store](https://apps.apple.com/us/app/ntfy/id1625396347)). Instant delivery on iOS requires Apple's push service — for the public ntfy.sh server, this works out of the box. For self-hosted servers, you'd need `upstream-base-url: "https://ntfy.sh"` in the server config ([details](https://docs.ntfy.sh/config/#ios-instant-notifications)).

## Mac — publish (nothing to install)

`curl` ships with macOS. Publishing to ntfy is just HTTP POST:

```bash
curl -d "build done ✓" \
     -H "Title: Deploy" \
     -H "Tags: white_check_mark" \
     https://ntfy.sh/your-unguessable-topic-name
```

Phone buzzes within a second. That's the whole system.

**With the ntfy CLI** (optional, `brew install ntfy`):

```bash
ntfy publish --title "Deploy" --tags white_check_mark \
     your-unguessable-topic-name "build done ✓"
```

## Real-world one-liners

```bash
# success / failure pattern — the workhorse
./build.sh  && curl -d "finished clean" -H "Title: Build" -H "Tags: white_check_mark" \
                  https://ntfy.sh/your-unguessable-topic-name
./build.sh  || curl -d "exit $? — check logs" -H "Title: Build FAILED" \
                  -H "Priority: urgent" -H "Tags: fire" \
                  https://ntfy.sh/your-unguessable-topic-name

# wait for a command, then notify (ntfy CLI)
ntfy pub --wait-cmd your-unguessable-topic-name ./deploy.sh

# wait for a PID, then notify (ntfy CLI)
ntfy pub --wait-pid 1234 your-unguessable-topic-name "process done"
```

## The pingdesk() helper

A five-line shell function (`~/.zshrc` on the Mac) turns every long-running command into a notifying one:

```bash
pingdesk() {
  local topic="your-unguessable-topic-name"
  "$@" \
    && curl -sf -H "Title: ✓ done" -H "Tags: white_check_mark" \
         -d "finished: $*" "https://ntfy.sh/$topic" \
    || curl -sf -H "Title: ✗ FAILED" -H "Priority: urgent" -H "Tags: fire" \
         -d "exit $? — $*" "https://ntfy.sh/$topic"
}
```

Then `pingdesk ./build.sh`, `pingdesk npm test`, `pingdesk ./migrate.sh` — walk away; the verdict finds you.

## What you're trading for simplicity

Messages pass through ntfy.sh's servers — encrypted in transit (HTTPS), but not end-to-end on your tailnet. For build alerts and backup notifications, that's a reasonable trade. When you're ready for full privacy, **Path C** keeps every message on your own machines.

**One caution:** if your topic name is guessable (like `desk` or `alerts`), strangers can subscribe and read your messages. Use a random string: `ntfy.sh/xk7-qt9-mbp` is fine.

**Works everywhere** — same WiFi, different city, cellular — because ntfy.sh is on the public internet. No Tailscale needed for this path (though you'll want it for the VNC rig in B-26 anyway).

---

# Path B — Windows: full auto-mirror (yes, Windows can do it)

Unlike macOS, Windows has a **public API** for reading other apps' notifications. The `UserNotificationListener` API lets any app intercept every desktop notification — Slack, Teams, Outlook, system alerts, everything. This means Windows gets the full auto-mirror path, just like Ubuntu.

## How it works

Windows notifications go through the Action Center. The `UserNotificationListener` API taps into that stream:

```
┌─────────────────────────────┐
│  Any app sends a notification│
│  → Windows Action Center     │
│    UserNotificationListener  │
├─────────────────────────────┤
│  notify-forward script       │
│  intercepts all toasts       │
│  extracts: app, title, body  │
├─────────────────────────────┤
│  curl → ntfy server          │
│  (self-hosted or ntfy.sh)   │
├─────────────────────────────┤
│  Phone ntfy app              │
│  buzzes with native sound    │
└─────────────────────────────┘
```

## Phone — subscribe (same as Mac)

Same 30-second setup. Install ntfy app, subscribe to your topic.

## Windows — publish (PowerShell)

PowerShell ships with Windows. Publishing is just HTTP POST:

```powershell
Invoke-RestMethod -Uri "https://ntfy.sh/your-unguessable-topic-name" `
    -Method Post `
    -Body "build done" `
    -Headers @{ Title = "Deploy"; Tags = "white_check_mark" }
```

**With the ntfy CLI** (optional, `winget install binwiederhier.ntfy`):

```powershell
ntfy publish --title "Deploy" --tags white_check_mark `
    your-unguessable-topic-name "build done"
```

## Full auto-mirror — Python script

This script uses the `winrt` package to intercept all Windows notifications and forward them to ntfy:

```python
# notify_forward.py
# Intercepts ALL Windows desktop notifications and forwards to phone via ntfy
# Usage: python notify_forward.py

import asyncio
import requests
from winrt.windows.ui.notifications.management import UserNotificationListener
from winrt.windows.ui.notifications import NotificationKinds

TOPIC = "your-unguessable-topic-name"
SERVER = "https://ntfy.sh"

async def main():
    listener = UserNotificationListener.get_current()

    # Request access (one-time, user must approve)
    access_status = await listener.request_access_async()
    if access_status != 1:  # ALLOWED
        print("Notification access denied. Enable in Settings → Notifications.")
        return

    print(f"Listening for notifications → {SERVER}/{TOPIC}")

    # Get current notifications
    notifications = await listener.get_notifications_async(NotificationKinds.TOAST)

    seen_ids = set()
    for notif in notifications:
        seen_ids.add(notif.id)

    # Poll for new notifications every 2 seconds
    while True:
        await asyncio.sleep(2)
        notifications = await listener.get_notifications_async(NotificationKinds.TOAST)

        for notif in notifications:
            if notif.id in seen_ids:
                continue
            seen_ids.add(notif.id)

            # Extract info
            app = notif.app_info.display_name or "Unknown"
            binding = notif.notification.visual.get_binding_at(0)
            if binding:
                texts = binding.get_text_elements()
                title = texts.get_at(0) if texts.size > 0 else ""
                body = texts.get_at(1) if texts.size > 1 else ""
            else:
                title = ""
                body = ""

            if not title and not body:
                continue

            message = body or title
            try:
                requests.post(
                    f"{SERVER}/{TOPIC}",
                    data=message.encode("utf-8"),
                    headers={"Title": title or app, "Tags": app},
                    timeout=5,
                )
                print(f"→ [{app}] {title}: {body}")
            except Exception as e:
                print(f"Failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
```

### Install and run

```powershell
# Install dependencies (one-time)
pip install winrt-python requests

# Run
python notify_forward.py
```

**Windows will prompt you** to allow notification access. Click "Allow". This is a one-time permission — the script can now read all notifications.

### Run on startup

Create a shortcut to the script in your Startup folder:

```powershell
# Open Startup folder
shell:startup

# Create shortcut to your script
# Right-click → New → Shortcut → browse to python.exe + script path
```

## Option 1 — ntfy.sh public server (simplest)

Zero server setup. The script publishes to ntfy.sh. Works immediately.

**Trade-off:** Messages pass through ntfy.sh's servers — encrypted in transit (HTTPS), but not end-to-end on your tailnet. For build alerts and backup notifications, that's a reasonable trade.

## Option 2 — Self-hosted ntfy (full privacy)

Messages never leave your tailnet. The Ubuntu box (or any machine) is the ntfy server. See **Path C** for server setup.

On Windows, just change the `SERVER` variable in the script:

```python
SERVER = "http://100.71.27.48:8090"  # Your Ubuntu ntfy server on tailnet
```

Inside the tailnet, WireGuard encrypts plain HTTP traffic. Never port-forward 8090 to the internet.

## What you're trading for simplicity

The `UserNotificationListener` API requires user permission — Windows will prompt you once. Some security-sensitive apps (banking, password managers) may not show full notification content. This is a Windows security feature, not a bug.

---

# Path C — Ubuntu: every notification, auto-mirrored (full privacy)

This is the full prize. A script on the Ubuntu box intercepts **every** desktop notification — from any app — and forwards it to your phone via ntfy. No per-app configuration. No curl commands to remember. It just works. This path keeps every message on your own machines — no third-party servers.

## How it works

Linux desktops use **D-Bus** for notifications. Every app that shows a notification — Slack, Thunderbird, Firefox, system updates, build agents — sends it through `org.freedesktop.Notifications` on the session bus. A small script listens on that bus, grabs every notification, and publishes it to ntfy:

```
┌─────────────────────────────┐
│  Any app sends a notification│
│  → D-Bus session bus         │
│    org.freedesktop.Notifications│
├─────────────────────────────┤
│  notify-forward script       │
│  intercepts (eavesdrop=true)│
│  extracts: app, title, body │
├─────────────────────────────┤
│  curl → ntfy server          │
│  (self-hosted or ntfy.sh)   │
├─────────────────────────────┤
│  Phone ntfy app              │
│  buzzes with native sound    │
└─────────────────────────────┘
```

## Option 1 — ntfy.sh public server (simplest)

Zero server setup. The script publishes to ntfy.sh. Works immediately.

```bash
#!/bin/bash
# ~/scripts/notify-forward.sh
# Intercepts ALL desktop notifications and forwards to phone via ntfy
# Usage: nohup ~/scripts/notify-forward.sh &

TOPIC="your-unguessable-topic-name"
SERVER="https://ntfy.sh"

dbus-monitor "interface='org.freedesktop.Notifications'" | \
while IFS= read -r line; do
    if echo "$line" | grep -q "method call"; then
        # Read the next 8 lines (notification args)
        args=()
        for i in {1..8}; do
            IFS= read -r argline
            args+=("$argline")
        done

        # Extract app name (arg 0), title (arg 3), body (arg 4)
        app=$(echo "${args[0]}" | sed 's/.*string "//;s/".*//')
        title=$(echo "${args[3]}" | sed 's/.*string "//;s/".*//')
        body=$(echo "${args[4]}" | sed 's/.*string "//;s/".*//')

        # Skip empty notifications
        [ -z "$title" ] && [ -z "$body" ] && continue

        # Forward to ntfy
        message="${body:-$title}"
        curl -sf -d "$message" \
             -H "Title: ${title:-$app}" \
             -H "Tags: $app" \
             "$SERVER/$TOPIC" >/dev/null 2>&1 &
    fi
done
```

Make it executable and run it:

```bash
chmod +x ~/scripts/notify-forward.sh
nohup ~/scripts/notify-forward.sh &
```

**Test it:**

```bash
notify-send "Test notification" "This should appear on your phone"
```

Phone buzzes with the test message. Every notification from every app now goes to your phone.

## Option 2 — Self-hosted ntfy (full privacy)

Messages never leave your tailnet. The Ubuntu box is the ntfy server — no Docker needed.

### Install ntfy via apt

```bash
sudo mkdir -p /etc/apt/keyrings
sudo curl -L -o /etc/apt/keyrings/ntfy.gpg https://archive.ntfy.sh/apt/keyring.gpg
sudo apt install apt-transport-https
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/ntfy.gpg] https://archive.ntfy.sh/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/ntfy.list
sudo apt update && sudo apt install ntfy
sudo systemctl enable --now ntfy
```

(Arm64 SBC readers: same block, `arch=arm64`; a Raspberry Pi makes a fine notification server.)

### Configure for your tailnet

```bash
# /etc/ntfy/server.yml
base-url: "http://100.x.y.z:8090"
listen-http: ":8090"
cache-file: "/var/cache/ntfy/cache.db"
```

Restart: `sudo systemctl restart ntfy`

### Point the forward script at your server

Change the `SERVER` variable in the script:

```bash
SERVER="http://100.x.y.z:8090"
```

### Phone — subscribe to your server

In the ntfy app, tap **+** → enter `http://100.x.y.z:8090/your-unguessable-topic-name` (the Ubuntu box's tailnet IP, not ntfy.sh).

### Prove it's alive

```bash
curl -d "hello from the desk" http://localhost:8090/desk
```

You'll get a JSON receipt — the message ID, the topic, the expiry. That JSON coming back is the server working.

## Running as a service (auto-start on boot)

```bash
# ~/.config/systemd/user/notify-forward.service
[Unit]
Description=Forward desktop notifications to phone via ntfy
After=graphical-session.target

[Service]
Type=simple
ExecStart=%h/scripts/notify-forward.sh
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now notify-forward.service
systemctl --user status notify-forward.service
```

---

# Wiring it in

## The everyday patterns

**Agents and long jobs** — the single highest-value wiring for the B-26 reader. Wrap the agent run; the "awaiting your approval" moment becomes a buzz instead of a polling ritual:

```bash
pingdesk claude "refactor the payments module and run tests"
```

**cron, Ubuntu** — the classic. A job that only *fails* loudly:

```bash
# crontab -e
0 2 * * *  /home/you/scripts/backup.sh \
  || curl -sf -H "Priority: urgent" -H "Tags: floppy_disk" \
       -d "nightly backup FAILED on $(hostname)" http://100.x.y.z:8090/desk
```

**systemd units, Ubuntu** — cleaner still, no wrapper needed; `OnFailure=` fires a one-shot unit when the main one dies ([systemd docs](https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html)):

```ini
# /etc/systemd/system/notify-failed@.service
[Unit]
Description=Notify phone that %i failed

[Service]
Type=oneshot
ExecStart=curl -sf -H "Priority: urgent" -d "unit %i failed on $(hostname)" http://100.x.y.z:8090/desk
```

```bash
# then, in any unit you care about:
# [Unit]
# OnFailure=notify-failed@%n.service
```

**Mac** — same `pingdesk` in any terminal, Script Editor shell snippets, or a Shortcuts automation that runs a shell script; the Mac side needs no daemon because it's only ever the sender.

## Choosing priorities and tags

ntfy's priority runs 1–5 (`min`, `low`, `default`, `high`, `urgent`) — reserve 4–5 for "act now," or the phone trains you to ignore it. Tags render as emoji on the notification itself (`fire`, `white_check_mark`, `floppy_disk`, `skull`), a free visual triage layer. `Title` is the bold line; the `-d` body is the detail. The full header set — `Click` to attach a URL, `Attach` for files, even `At`/`In` for scheduled delivery — is in the [publish docs](https://docs.ntfy.sh/publish/).

---

# Reference: troubleshooting & security

## Symptom → cause → fix

| Symptom | Cause | Fix |
|---|---|---|
| Publish works, JSON receipt comes back, phone silent | App never subscribed to the right server (default is ntfy.sh) | Re-check the subscription URL: exact server, exact topic, exact port |
| Works, then randomly stops for hours | Android battery optimization killed the connection | Exempt ntfy from battery optimization; keep the foreground-service notification enabled |
| Nothing anywhere, even `curl` from the box fails | Server down / wrong port | `docker ps` or `systemctl status ntfy`; test with `curl -d hi http://localhost:8090/desk` |
| Works on home WiFi, dead on cellular | Phone's Tailscale is off | Same B-26 check: the key icon, `tailscale status` from a desk |
| Mac's curl times out, phone fine | Mac left the tailnet | `tailscale status` on the Mac; the Ubuntu box's line must show connected |
| Message arrives but hours late | Phone was off / doze without foreground service | Reconnect; the 12h cache backfills what was missed — that's the cache file earning its keep |
| "Connection refused" from curl | Right IP, server not listening on 8090 | Check `ss -tlnp \| grep 8090`; re-run the apt install / systemctl enable |
| D-Bus forward script sees nothing | Session bus restricts eavesdropping | Test: `dbus-monitor "interface='org.freedesktop.Notifications'"`; if empty, check `/usr/share/dbus-1/session.conf` for eavesdrop limits |
| Forward works but duplicates appear | Notification daemon forwards its own messages | Add a check: skip messages where `$NTFY_TOPIC` matches the forward topic |

## Security recap

- **The server is only as exposed as you make it.** With `-p 8090:80`, the port answers on the Ubuntu box's home-LAN IP *and* its tailnet IP — the same trust posture as B-26's port 5900, fine behind a home router. Want it tailnet-only? Bind it: `-p 100.x.y.z:8090:80` (the box's tailnet IP), or firewall it to the tailscale interface (`ufw allow in on tailscale0 to any port 8090`).
- **Inside the tailnet, traffic is WireGuard-encrypted anyway** — plain HTTP to the tailnet IP is encrypted in transit by the tunnel. TLS on top (via a reverse proxy or `tailscale serve`) is polish, not a hole.
- **Self-hosted ntfy runs without accounts by default** — correct for a tailnet-only deployment, because reaching the port already required being one of *your* devices. If you ever expose it beyond the tailnet, add ntfy's access-control (`auth-file`) first; topic names are not secrets a stranger can't guess.
- **Never port-forward 8090 to the internet.** Same rule as 5900 in B-26, same reason: the tailnet already reaches everywhere you are.
- **ntfy.sh public topics** — the topic name *is* the password. Use a random string (e.g., `ntfy.sh/xk7-qt9-mbp`), never a dictionary word. Anyone who guesses the topic can read your messages.
- **D-Bus eavesdropping** — the forward script uses `eavesdrop=true` on the session bus, which works on most default configs. If your distro restricts it, the script silently sees nothing (no security hole, just no notifications forwarded).

## Escape hatches

- **No Ubuntu box, Mac only?** Use Path A (ntfy.sh public server). For auto-mirror, there's no clean solution on macOS — Apple confirmed there's no public API for cross-app notification interception ([source](https://forums.developer.apple.com/forums/thread/758451)).
- **Hate self-hosting anything?** The `curl` shape of this entire post works unchanged against `https://ntfy.sh/your-unguessable-topic` — swap the URL, keep every one-liner. You lose "never leaves your machines," gain nothing to maintain.
- **KDE Connect** can mirror desktop notifications to an Android phone over an IP you give it, tailnet IPs included per community reports — plausible, elegant, but doesn't work reliably over Tailscale (UDP broadcast issues, [tailscale#14476](https://github.com/tailscale/tailscale/issues/14476)) and has no macOS support for the "send notifications to phone" direction.
- **Need the actual audio, not the notification?** Re-read Part 1 of B-26's "what would actually get me audio" — it's a different rig, and now you know exactly why.

---

# Where this landed

Verified live: ntfy publish via curl and CLI on macOS, JSON receipts, priority/tags/click headers, the subscribe command's environment variables, and the D-Bus `org.freedesktop.Notifications` interface on Linux. The ntfy.sh public server received and stored every test message. The macOS notification interception limitation confirmed by Apple's own developer forums. The D-Bus eavesdrop approach confirmed by multiple independent implementations ([ntfy-dbus](https://github.com/freefd/ntfy-dbus), [go-notify-forwarder](https://github.com/polographer/go-notify-forwarder), [krafi.org tutorial](https://krafi.org/blog/automation/3.Linux_Desktop_Notifications_on_Telegram)).

What this adds to the B-26 rig is the missing direction. The pocket could already reach the desk; now the desk can reach the pocket — in ~40 bytes instead of a video stream, through a channel that makes no sound of its own because it borrows the phone's, and at a price of one `curl` or one `apt install`. The couch was already a valid place to get something done. Now it's also a valid place to *not watch* something get done — the build will call you when it matters.

---

## Tools & licenses

| Tool | Role | License / cost |
|---|---|---|
| [ntfy](https://github.com/binwiederhier/ntfy) | Notification server + publish CLI + phone apps | Apache-2.0 / GPL-2.0 mixed; server and apps free, no account needed for self-host |
| [Tailscale](https://tailscale.com/) | The transport (unchanged from B-26) | Free personal plan; WireGuard end-to-end |
| curl | The publisher, both OSes | Ships with macOS and Ubuntu |
| D-Bus | Linux notification bus (intercept layer) | Built into every Linux desktop |
| [RealVNC Viewer](https://www.realvnc.com/en/connect/download/viewer/) | Referenced (the rig it extends) | Free for personal use, direct-connection mode |
| [x11vnc](https://github.com/LibVNC/x11vnc), macOS Screen Sharing | Referenced (whose audio limits B-26 Part 1 documents) | GPL-2.0 / built-in |

Sources for the no-audio claims, all cited in place: [RealVNC — Audio in RealVNC Connect](https://help.realvnc.com/hc/en-us/articles/360002504358-Audio-in-RealVNC-Connect) · [x11vnc FAQ Q-129](https://github.com/LibVNC/x11vnc/blob/master/doc/FAQ.md) · [RealVNC Lite plan](https://www.realvnc.com/en/connect/plan/lite/) · [Apple — High Performance screen sharing](https://support.apple.com/guide/remote-desktop/use-high-performance-screen-sharing-apdf8e09f5a9/mac).

Sources for the macOS notification limitation: [Apple Developer Forums #758451](https://forums.developer.apple.com/forums/thread/758451) · [macos-notification-cli](https://github.com/coryfklein/macos-notification-cli) (Accessibility API workaround, fragile and permission-dependent).

Sources for the D-Bus approach: [freefd/ntfy-dbus](https://github.com/freefd/ntfy-dbus) · [polographer/go-notify-forwarder](https://github.com/polographer/go-notify-forwarder) · [krafi.org — Linux Desktop Notifications on Telegram](https://krafi.org/blog/automation/3.Linux_Desktop_Notifications_on_Telegram) · [sleeplessbeastie — eavesdrop D-Bus notifications](https://sleeplessbeastie.eu/2025/06/03/how-to-eavesdrop-and-log-d-bus-notifications/).

---

## Which Tool Should You Choose?

This blog recommends only tools with verified security properties. Here's why:

### What We Tested

| Tool | Security Verdict | Why |
|---|---|---|
| **ntfy** | ✅ Recommended | Fixed CVE-2026-39087 (v2.22.0+), current version v2.27.0. Open source (Apache 2.0/GPL 2.0), ACL system with per-topic permissions, bcrypt password hashing, rate limiting. Self-hosted option keeps all data on your tailnet. |
| **Gotify** | ✅ Recommended | Fixed CVE-2022-46181 and CVE-2023-24689 (v2.2.2+), current version v2.6.0. Open source (MIT), self-hosted binary (no Docker required). Android + web only — no iOS app. |
| **Pushover** | ⚠️ Closed Source | AES-256 encryption for iOS/Android payloads, TLS in transit. Hosted SaaS (US-based), $5 one-time per platform. No E2EE for desktop/browser clients. Proprietary — cannot audit. |
| **Telegram Bot API** | ❌ Not Recommended | No end-to-end encryption. Bots don't use MTProto — messages decrypted on Telegram servers. Post-2024 data sharing with governments on valid legal orders. Russian-linked infrastructure concerns. |
| **Hook.Notifier** | ❌ Not Recommended | Newer, less audited. Privacy policy is vague ("third party service providers"). No independent security review. |
| **KDE Connect** | ❌ Broken | Relies on UDP broadcast — doesn't work over Tailscale. No macOS support for notification mirroring to phone. |

### Security Comparison

| Property | ntfy | Gotify | Pushover | Telegram Bot | Hook.Notifier |
|---|---|---|---|---|---|
| **Open source** | ✅ Apache 2.0 | ✅ MIT | ❌ Proprietary | ❌ Proprietary | ✅ MIT |
| **Self-hostable** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **TLS in transit** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Encryption at rest** | ⚠️ HTTPS only | ⚠️ HTTPS only | ✅ AES-256 | ✅ Server-side | ❓ Unknown |
| **E2EE** | ❌ Not yet | ❌ No | ❌ No | ❌ Bots only | ❌ No |
| **CVE history** | 1 (fixed) | 2 (fixed) | None | N/A | None |
| **Community** | Large | Medium | Small | Large | Small |
| **Privacy** | ✅ Self-hosted = full control | ✅ Self-hosted = full control | ⚠️ Hosted (US) | ❌ Hosted (Russia-linked) | ❓ Vague policy |

### Our Recommendation

**For most people**: Use **ntfy** (Path A for Mac, Path B for Windows, Path C for Ubuntu). It's open source, self-hostable, has a large community, and the latest version (v2.27.0) has all known CVEs patched. The ntfy.sh public server is also patched and safe to use.

**If you want Android push notifications without FCM**: Use **Gotify**. Self-hosted binary (no Docker), open source, all CVEs fixed. Just note: no iOS app.

**If you want iOS push notifications**: Use **ntfy** with `upstream-base-url` configured for FCM/APNs, or use **Pushover** ($5 one-time). Telegram Bot API is not recommended due to privacy concerns.

**Avoid**: Telegram Bot API (no E2EE, privacy concerns), Hook.Notifier (less audited), KDE Connect (broken over Tailscale).

### UnifiedPush (KDE)

[UnifiedPush](https://unifiedpush.org/) is an open standard for push notifications on Linux. It abstracts the push backend (ntfy, Gotify, or others) behind a common interface. If you're on KDE Plasma, `apt install kunifiedpush` gives you a system-level push service. However, it requires compatible apps on your phone — ntfy and Gotify already work as UnifiedPush distributors.

For this blog, we recommend ntfy directly because it's simpler and doesn't require UnifiedPush compatibility.

---

## Let's Connect

Thank you for the time — genuinely. If you try any of this, I'd rather hear what broke than what worked:

- **Website**: [encryptioner.github.io](https://encryptioner.github.io)
- **LinkedIn**: [Mir Mursalin Ankur](https://www.linkedin.com/in/mir-mursalin-ankur)
- **GitHub**: [@Encryptioner](https://github.com/Encryptioner)
- **X (Twitter)**: [@AnkurMursalin](https://twitter.com/AnkurMursalin)
- **Technical Writing**: [Nerddevs](https://nerddevs.com/author/ankur/)
- **Support**: [SupportKori](https://www.supportkori.com/mirmursalinankur)
