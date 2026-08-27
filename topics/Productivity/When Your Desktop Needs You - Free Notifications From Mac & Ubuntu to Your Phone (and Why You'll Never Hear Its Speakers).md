# When Your Desktop Needs You — Free Notifications From Mac & Ubuntu to Your Phone

> The phone already controls the desk. The missing half is the desk tapping you back.

A build's been running for twenty minutes. An agent is waiting on your "looks good." A backup either succeeded at 2 a.m. or didn't. Your phone is in your pocket, perfectly capable of making a sound — and it stays silent, because the desktop has no way to reach it. You poll. You unlock the phone, open the VNC app, squint at a terminal, close it. Twenty minutes later, again.

This post fixes that. Two paths, one tool — **[ntfy](https://ntfy.sh/)**, an open-source notification service that speaks plain HTTP:

- **Path A — Mac, zero setup.** `curl` publishes to ntfy.sh's free server. Phone subscribes. Works in 30 seconds, same WiFi or cellular.
- **Path B — Ubuntu, full auto.** A D-Bus script intercepts *every* desktop notification and forwards them all to your phone. Self-hosted on your tailnet. Nothing leaves your machines.

Both paths are free. Both work over Tailscale. The core idea: **don't ship the sound, ship the sentence.** The phone's notification system makes sounds natively, for free, better than any audio stream would.

---

# Path A — Mac: 30 seconds to first buzz

No server. No Docker. No apt. The Mac publishes, the phone subscribes, ntfy.sh carries the message.

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

Phone buzzes within a second. That's the whole setup.

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

Then `pingdesk ./build.sh`, `pingdesk npm test`, `pingdesk ./migrate.sh` — walk away; the result finds you.

## Privacy trade-off

Messages pass through ntfy.sh's servers — encrypted in transit (HTTPS), but not end-to-end on your tailnet. For build alerts and backup notifications, that's fine. When you want full privacy, **Path B** keeps every message on your own machines.

**One caution:** if your topic name is guessable (like `desk` or `alerts`), strangers can subscribe. Use a random string: `ntfy.sh/xk7-qt9-mbp` is fine.

Works on same WiFi, different city, or cellular — ntfy.sh is on the public internet. No Tailscale needed for this path (though you'll want it for the VNC rig in B-26 anyway).

---

# Path B — Ubuntu: every notification, auto-mirrored (full privacy)

A script on the Ubuntu box intercepts **every** desktop notification — from any app — and forwards it to your phone via ntfy. No per-app configuration. No curl commands to remember. This path keeps every message on your own machines — no third-party servers.

## What D-Bus gives you

Linux desktops use **D-Bus** for notifications. Every app that shows a notification — Slack, Thunderbird, Firefox, system updates, build agents — sends it through `org.freedesktop.Notifications` on the session bus. A small script listens on that bus, grabs every notification, and publishes it to ntfy.

Two gotchas from live testing on Ubuntu 22.04 GNOME — both baked into the script below:

1. **GNOME fires every notification twice.** The app calls `Notify` on gnome-shell, and gnome-shell *re-forwards* the same `Notify` to the display daemon ~1.5 ms later. A naive listener double-buzzes your phone for every Slack message. The script dedupes identical title+body within a 5-second window.
2. **Filter on `member=Notify`, not just the interface.** Other traffic rides the same interface — `GetServerInformation` calls (zero arguments), returns, close events. A parser that greps only "method call" reads eight lines after a zero-arg call and consumes the *real* notification's lines. The match rule `interface=...,member=Notify` plus the `method call.*member=Notify` grep keeps only actual notifications.

The interception itself needs no special permissions on stock Ubuntu: `dbus-monitor` with a match rule switches to the bus's monitor API (dbus ≥ 1.10 — so Ubuntu 20.04's dbus 1.12, 22.04's 1.12, and 24.04's 1.14 all behave the same).

## Option 1 — ntfy.sh public server (simplest)

Zero server setup. The script publishes to ntfy.sh. Works immediately.

```bash
#!/bin/bash
# ~/scripts/notify-forward.sh
# Intercepts ALL desktop notifications and forwards to phone via ntfy
# Usage: nohup ~/scripts/notify-forward.sh &

TOPIC="your-unguessable-topic-name"
SERVER="https://ntfy.sh"

dbus-monitor "interface='org.freedesktop.Notifications',member='Notify'" |
while IFS= read -r line; do
    # Only the Notify method call itself — not GetServerInformation,
    # not method returns, not close signals
    echo "$line" | grep -q "method call.*member=Notify" || continue

    # Notify args arrive one per line:
    # app_name, replaces_id, app_icon, summary (title), body
    mapfile -n 5 -t args
    app=$(echo "${args[0]}" | sed 's/.*string "//;s/".*//')
    title=$(echo "${args[3]}" | sed 's/.*string "//;s/".*//')
    body=$(echo "${args[4]}" | sed 's/.*string "//;s/".*//')

    # Skip empty notifications
    [ -z "$title" ] && [ -z "$body" ] && continue

    # GNOME re-forwards every notification to its display daemon within
    # milliseconds — without this window you'd get every buzz twice
    now=$(date +%s)
    if [ "$title|$body" = "$last_msg" ] && [ $((now - last_ts)) -lt 5 ]; then
        continue
    fi
    last_msg="$title|$body"; last_ts=$now

    # Forward to ntfy
    message="${body:-$title}"
    curl -sf -d "$message" \
         -H "Title: ${title:-$app}" \
         -H "Tags: $app" \
         "$SERVER/$TOPIC" >/dev/null 2>&1 &
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

(`notify-send` lives in `libnotify-bin` — preinstalled on desktop Ubuntu; `sudo apt install libnotify-bin` if a minimal install lacks it.)

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

**Agents and long jobs** — the highest-value wiring. Wrap the agent run; the "awaiting your approval" moment becomes a buzz instead of a polling ritual:

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

**Mac** — same `pingdesk` in any terminal, Script Editor shell snippets, or a Shortcuts automation that runs a shell script. No daemon on the Mac; it's only ever the sender.

ntfy's priority runs 1–5 (`min`, `low`, `default`, `high`, `urgent`) — reserve 4–5 for "act now," or the phone trains you to ignore it. Tags render as emoji on the notification itself (`fire`, `white_check_mark`, `floppy_disk`, `skull`), a free visual triage layer. The full header set — `Click` for a URL, `Attach` for files, `At`/`In` for scheduled delivery — is in the [publish docs](https://docs.ntfy.sh/publish/).

---

# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Publish works, JSON receipt comes back, phone silent | App never subscribed to the right server (default is ntfy.sh) | Re-check the subscription URL: exact server, exact topic, exact port |
| Works, then randomly stops for hours | Android battery optimization killed the connection | Exempt ntfy from battery optimization; keep the foreground-service notification enabled |
| Nothing anywhere, even `curl` from the box fails | Server down / wrong port | `systemctl status ntfy`; test with `curl -d hi http://localhost:8090/desk` |
| Works on home WiFi, dead on cellular | Phone's Tailscale is off | Same B-26 check: the key icon, `tailscale status` from a desk |
| Mac's curl times out, phone fine | Mac left the tailnet | `tailscale status` on the Mac; the Ubuntu box's line must show connected |
| Message arrives but hours late | Phone was off / doze without foreground service | Reconnect; the 12h cache backfills what was missed — that's the cache file earning its keep |
| "Connection refused" from curl | Right IP, server not listening on 8090 | Check `ss -tlnp \| grep 8090`; re-run the apt install / systemctl enable |
| D-Bus forward script sees nothing | Session bus restricts monitoring, or script not in your session | Test: `dbus-monitor "interface='org.freedesktop.Notifications',member='Notify'"`, then fire `notify-send hi there` — if the terminal stays empty while the toast appears, check `/usr/share/dbus-1/session.conf` for monitor/eavesdrop limits |
| Forward works but every buzz arrives twice | GNOME's daemon re-forwards each `Notify` to its display daemon — the bus legitimately sees it twice | Already handled by the 5-second dedup window in the script; if you wrote your own, add one |
| One specific app never forwards (others fine) | That app bypasses the session bus — some Electron/Chromium builds ship their own notification path | Verify with the `dbus-monitor` test above; if the app never hits the bus, wire that app's own webhook/command to `curl` instead |

## Security notes

- **The server is only as exposed as you make it.** With the apt install's `listen-http: ":8090"`, the port answers on the Ubuntu box's home-LAN IP *and* its tailnet IP — fine behind a home router. Want it tailnet-only? Bind it: `listen-http: "100.x.y.z:8090"`, or firewall it to the tailscale interface (`ufw allow in on tailscale0 to any port 8090`).
- **Inside the tailnet, traffic is WireGuard-encrypted anyway** — plain HTTP to the tailnet IP is encrypted in transit by the tunnel. TLS on top is polish, not a hole.
- **Self-hosted ntfy runs without accounts by default** — fine for a tailnet-only deployment, because reaching the port already required being one of *your* devices. If you ever expose it beyond the tailnet, add ntfy's access-control (`auth-file`) first.
- **Never port-forward 8090 to the internet.** Same rule as 5900 in B-26, same reason.
- **ntfy.sh public topics** — the topic name *is* the password. Use a random string (e.g., `ntfy.sh/xk7-qt9-mbp`), never a dictionary word.
- **D-Bus monitoring** — the forward script runs `dbus-monitor` with a plain match rule, which needs no extra permissions on stock Ubuntu 20.04/22.04/24.04. If your distro hardens the session bus policy, the script silently sees nothing (no security hole, just no notifications forwarded).

## What if ntfy isn't right for you

- **No Ubuntu box, Mac only?** Use Path A (ntfy.sh public server). For auto-mirror, there's no clean solution on macOS — Apple confirmed there's no public API ([source](https://forums.developer.apple.com/forums/thread/758451)).
- **Hate self-hosting?** The `curl` shape works unchanged against `https://ntfy.sh/your-unguessable-topic` — swap the URL, keep every one-liner. You lose "never leaves your machines," gain nothing to maintain.
- **KDE Connect** can mirror notifications over an IP you give it, but doesn't work reliably over Tailscale (UDP broadcast issues, [tailscale#14476](https://github.com/tailscale/tailscale/issues/14476)) and has no macOS support.
- **Need the actual audio, not the notification?** Re-read Part 1 of B-26's "what would actually get me audio" — it's a different rig, and now you know exactly why.

---

## Tools & licenses

| Tool | Role | License / cost |
|---|---|---|
| [ntfy](https://github.com/binwiederhier/ntfy) | Notification server + publish CLI + phone apps | Apache-2.0 / GPL-2.0 mixed; server and apps free |
| [Tailscale](https://tailscale.com/) | The transport (unchanged from B-26) | Free personal plan; WireGuard end-to-end |
| curl | The publisher | Ships with macOS and Ubuntu |
| D-Bus | Linux notification bus | Built into every Linux desktop |

---

## Let's Connect

If you try any of this, I'd rather hear what broke than what worked:

- **Website**: [encryptioner.github.io](https://encryptioner.github.io)
- **LinkedIn**: [Mir Mursalin Ankur](https://www.linkedin.com/in/mir-mursalin-ankur)
- **GitHub**: [@Encryptioner](https://github.com/Encryptioner)
- **X (Twitter)**: [@AnkurMursalin](https://twitter.com/AnkurMursalin)
- **Technical Writing**: [Nerddevs](https://nerddevs.com/author/ankur/)
- **Support**: [SupportKori](https://www.supportkori.com/mirmursalinankur)
