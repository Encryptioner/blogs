# When Your Desktop Needs You — Free Notifications From Mac & Ubuntu to Your Phone (and Why You'll Never Hear Its Speakers)

> The phone already controls the desk. The missing half is the desk tapping you back — without you holding a VNC session open all day to find out.

[Your Desk in Your Pocket](./Your%20Desk%20in%20Your%20Pocket%20-%20Free%20Remote%20Control%20for%20Mac%20%26%20Ubuntu%2C%20Same%20Room%20or%20Anywhere%20on%20Earth.md) built one arrow: the phone drives the Mac and the Ubuntu box from the couch or from another city. But every scenario in that post starts the same way — *you* open the app, *you* look. The reverse arrow never existed. So this happens:

A build's been running for twenty minutes. An agent is mid-task and waiting on your "looks good." A backup job either succeeded at 2 a.m. or didn't. Your phone is in your pocket the whole time, perfectly capable of making a sound — and it stays silent, because the desktop has no way to reach it. You poll. You unlock the phone, open the VNC app, squint at a terminal, close it. Twenty minutes later, again. That's not remote control; that's a watchman's shift.

This post fixes exactly that, and it answers the question everyone asks first — "can't the desktop's sound just come through, like a Zoom call?" — with actual data, because the answer is **no, three separate times over**, and understanding *why* is what makes the fix obvious.

What the fix looks like, in one line:

```bash
./build.sh && curl -d "build done ✓" http://100.x.y.z:8090/desk
```

Run anywhere on either machine — the phone buzzes a second later, at home or on cellular, with a sound the **phone** generates. No streaming, no subscription, no cloud account in the path.

## Topic flow

```
PART 1 — WHY YOU CAN'T HEAR IT (the data)     PART 2 — FLIP THE ARROW (the build)     PART 3 — WIRE IT IN (everyday)
─────────────────────────────────────────     ───────────────────────────────────     ─────────────────────────────
The Zoom comparison, dissected                Stop streaming sound;                  One-liners: done / failed
What RFB actually carries                     send a sentence instead                 The pingdesk() shell helper
The three blockers, with receipts             Ubuntu hosts (docker / apt)             Agent + build wrappers
Why Tailscale is innocent                     Phone subscribes (30 seconds)          cron + systemd OnFailure
What it would take to get audio               Mac publishes (curl, already there)    Reference — troubleshooting
─────────────────────────────────────────     ───────────────────────────────────     & security
     Read Part 1 once — it's short and it kills the "but why not just..."
     question forever. Part 2 is a 15-minute build. Part 3 is where it pays out daily.
```

## What it actually looks like

- **A build finishes.** Phone buzzes. You glance, you decide — open the VNC app and act, or keep resting. The desk waited politely instead of being polled.
- **An agent needs your nudge.** "Tests pass; awaiting approval" arrives as a notification. The B-26 rig handles the reply; this post handles the *summons*.
- **The 2 a.m. backup failed.** You find out at 2:00:01, not when you happen to log in Tuesday. `systemd` fires the same one-line curl.
- **You're on cellular, another city.** Same buzz, same second — because the message rides the same tailnet B-26 already built.
- **Nothing new to babysit.** No account, no monthly anything, no third-party cloud holding your messages — the notification server is your own Ubuntu box.

One idea makes all of it work — **don't ship the sound, ship the sentence.** The phone's notification system makes sounds natively, for free, better than any stream would. All the desktop has to do is get ~40 bytes to it.

---

# Part 1 — Why you can't just hear the desktop

## The Zoom comparison, and where it breaks

"It works on a video call, why not here?" — because a video call is a *voice app that also shows video*, and VNC is a *screen protocol that was never given a mouth*. Zoom carries an Opus audio stream as a first-class thing it was built to do. VNC — the RFB protocol every client in B-26 speaks — carries exactly two things, and the official x11vnc documentation says it in one line worth framing:

> **"Audio is not part of the VNC protocol."** You will have to use an external network audio mechanism for this.
> — [x11vnc FAQ, Q-129](https://github.com/LibVNC/x11vnc/blob/master/doc/FAQ.md)

Here's the whole stack, and where the sound dies:

```
┌────────────────────────────────────────────────┐
│  Desktop app plays a notification sound        │ ← happens, on the DESK's speakers
├────────────────────────────────────────────────┤
│  VNC server (macOS Screen Sharing / x11vnc)    │ ← forwards pixels + input. Sound
│    speaks RFB: framebuffer updates, key/mouse  │    never enters the protocol.
├────────────────────────────────────────────────┤
│  RealVNC Viewer on the phone                   │ ← can only play what it's sent:
│                                                │    rectangles and keystrokes.
├────────────────────────────────────────────────┤
│  Tailscale (WireGuard tunnel)                  │ ← carries anything, faithfully.
│                                                │    No audio in the payload =
└────────────────────────────────────────────────┘    nothing to deliver.
```

The sound never leaves the desk's speakers because the protocol above them has no slot for it. Everything else in this section is just proof that this isn't a setting you've missed.

## The three blockers, with receipts

Each of these alone kills phone-audio for the B-26 rig. Together they end the discussion:

| # | Blocker | The receipt |
|---|---------|-------------|
| 1 | **RealVNC's mobile app doesn't do audio at all** — any server, any plan | [Official: "Audio is not yet supported by RealVNC Connect for Mobile"](https://help.realvnc.com/hc/en-us/articles/360002504358-Audio-in-RealVNC-Connect) |
| 2 | **Your servers speak plain RFB.** RealVNC's audio is a proprietary extension — it requires their *Server* software speaking "High-Speed-Streaming (RFB protocol version 6)". macOS Screen Sharing and x11vnc speak classic RFB and cannot send it | [Same article](https://help.realvnc.com/hc/en-us/articles/360002504358-Audio-in-RealVNC-Connect); [x11vnc FAQ](https://github.com/LibVNC/x11vnc/blob/master/doc/FAQ.md) |
| 3 | **Audio is a paid-plan feature even inside RealVNC's ecosystem** — the free/Lite tier doesn't include it | [Lite plan](https://www.realvnc.com/en/connect/plan/lite/); the audio article's own requirement: "a plan that includes audio" |

And two footnotes that close the side doors:

- **The microphone door is welded shut too.** "Can I use the microphone on the RealVNC Viewer device on the remote computer? **No.** Unfortunately, this is not currently possible." — any platform, any plan ([source](https://help.realvnc.com/hc/en-us/articles/360002504358-Audio-in-RealVNC-Connect)).
- **Audio is muted by default even where it exists**, and must be enabled on *both* ends — server permission and viewer toolbar. If you ever do sit in front of a RealVNC-to-RealVNC paid session and hear nothing, that's the first check.

## The confusion this section exists to kill

**"So it's Tailscale's fault?"** — No, and this is worth being precise about, because it's the mistake that sends people shopping for VPN alternatives. Tailscale is a Layer-3 tunnel: it moves packets between your devices and asks no questions about contents. It carries whatever the app above it sends — VNC rectangles fine, an audio stream fine *if any app were sending one*. The audio dies at the RFB layer, one floor up. Replacing the postal service doesn't put a letter in an empty envelope.

**"Would paying RealVNC fix it?"** — Not for this rig. Their audio needs their Server on the desk (fine, paid), their protocol extension (fine, proprietary), and a Viewer that supports audio — and the mobile Viewer doesn't, full stop. Paying unlocks audio for *desktop-to-desktop* RealVNC sessions only.

**"What would actually get me audio?"** — For completeness, the honest paths, none of which is this rig:
- **Mac → Mac only:** Apple's own [High Performance screen sharing](https://support.apple.com/guide/remote-desktop/use-high-performance-screen-sharing-apdf8e09f5a9/mac) carries stereo audio — but Apple's client on Apple silicon, not a phone.
- **Desktop → desktop, paid:** RealVNC Connect with their Server on both ends, on a plan that includes audio (their Server 7.13+ added macOS 13+ audio; Linux needs `pulseaudio` installed).
- **Different tool family:** NoMachine and RustDesk carry audio by design — they're not VNC. Swapping the whole B-26 stack to chase notification *sounds* is exactly the wrong trade, which is the next section's point.

---

# Part 2 — Flip the arrow: send a sentence, not a sound

Here's the move that makes the whole problem dissolve: **the phone doesn't need to *hear* the desktop. It needs to *know*.** Android and iOS already have a world-class notification system — sounds, buzzes, lock-screen layout, Do-Not-Disturb rules, per-app priorities. Streaming desktop audio to piggyback a "ding" on it is using a fire hose to ring a doorbell.

So: a tiny message goes desk → phone; the phone's own notification machinery makes the sound. The tool that carries the message is **[ntfy](https://ntfy.sh/)** — an open-source notification service that speaks plain HTTP. Publish with a one-line `curl`. Subscribe with a phone app. Self-host it, and the entire system lives on your tailnet.

```
                    ┌──────────────────────────┐
  Mac (curl) ──────►│                          │─────► Android phone
                    │  Ubuntu box: ntfy        │       (ntfy app, subscribed,
  Ubuntu (curl) ───►│  on the tailnet IP       │        buzzes + sounds natively)
                    │  100.x.y.z:8090          │
                    └──────────────────────────┘
         both machines already reach this address —
         it's the same tailnet B-26 Part 2 built
```

One architectural fact, straight from ntfy's own install docs, decides who hosts: **"Only the ntfy CLI is supported on macOS. ntfy server is currently not supported"** on macOS ([source](https://docs.ntfy.sh/install/)). So the Ubuntu box is the host — it's the natural one anyway (always on, already in the tailnet, already the machine whose jobs you most want to hear about). The Mac publishes. The phone subscribes. Both directions of build below were run through live — the publish and read-back commands exactly as printed.

## On the Ubuntu box: host the server

**Route A — Docker** (if you finished B-26 with Docker on the box, this is two minutes):

```bash
docker run -d \
  --name ntfy \
  --restart unless-stopped \
  -v /var/cache/ntfy:/var/cache/ntfy \
  -p 8090:80 \
  binwiederhier/ntfy \
    serve --cache-file /var/cache/ntfy/cache.db
```

**Route B — apt** (no Docker on the box; from [ntfy's install docs](https://docs.ntfy.sh/install/)):

```bash
sudo mkdir -p /etc/apt/keyrings
sudo curl -L -o /etc/apt/keyrings/ntfy.gpg https://archive.ntfy.sh/apt/keyring.gpg
sudo apt install apt-transport-https
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/ntfy.gpg] https://archive.ntfy.sh/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/ntfy.list
sudo apt update && sudo apt install ntfy
sudo systemctl enable --now ntfy
```

(Arm64 SBC readers: same block, `arch=arm64`; the docs also carry armhf — a Raspberry Pi makes a fine notification server.)

Port `8090` avoids squatting on 80. The cache file keeps the last 12 hours of messages, so the phone can catch up on what it missed while off — this matters more than you'd think; it's why a phone coming back from airplane mode still shows you the 2 a.m. failure.

**Prove it's alive, from the box itself:**

```bash
curl -d "hello from the desk" http://localhost:8090/desk
```

You'll get a JSON receipt — the message ID, the topic, the expiry. That JSON coming back is the server working; keep reading for how the phone sees the same message.

## On the phone: subscribe (30 seconds, once)

1. Install the **ntfy app** — [Play Store](https://play.google.com/store/apps/details?id=io.heckel.ntfy) or [F-Droid](https://f-droid.org/en/packages/io.heckel.ntfy/) (the F-Droid build has no Google-services dependency at all).
2. Add a subscription with the **+**, and point it at your server, not ntfy.sh: use the deep-link form or type it in — `http://100.x.y.z:8090/desk`, where `100.x.y.z` is the **Ubuntu box's tailnet IP** (the same permanent address B-26 Part 2 made you save) and `desk` is the topic name.
3. Toggle Tailscale on, then hit the app's test button (or run the curl from the next section). Buzz = done.

Two Android facts worth knowing, both from ntfy's [phone docs](https://docs.ntfy.sh/subscribe/phone/):

- **Self-hosted subscriptions connect directly** to your server — no Google/cloud relay in the middle. To get *instant* delivery through Android's aggressive doze mode, the app runs a foreground service (you'll see a persistent "Subscribed to …" notification; that's the connection, working, not an error). Without it, "messages may arrive with a significant delay — sometimes many minutes, or even hours later."
- **Battery optimization is the #1 silence-maker.** If notifications lag on your phone, exempt the ntfy app from battery optimization (Settings → Apps → ntfy → Battery). Same genre of fix as B-26's "Android kills VPNs quietly."

**If your phone is an iPhone instead:** the iOS app can talk to a self-hosted server too, but instant delivery on iOS must ride Apple's push service — for that, a self-hosted ntfy needs `upstream-base-url: "https://ntfy.sh"` in its server config, which relays just the wakeup ping through ntfy.sh. It's a documented, bounded trade-off ([details](https://docs.ntfy.sh/config/#ios-instant-notifications)); on Android there's no such dependency at all, which is part of why the Android + self-host combination is the cleanest form of this rig.

## On the Mac: publish (nothing to install)

`curl` ships with macOS, and publishing to ntfy is just HTTP. The Mac needs **no setup at all** — it only ever *sends*:

```bash
# success and failure, one line each
./deploy.sh  && curl -H "Title: Deploy"   -H "Tags: white_check_mark" \
               -d "deploy.sh finished clean" http://100.x.y.z:8090/desk
./deploy.sh  || curl -H "Title: Deploy"   -H "Priority: urgent" -H "Tags: fire" \
               -d "deploy.sh FAILED — exit $?"  http://100.x.y.z:8090/desk
```

If you'd rather type less, `brew install ntfy` puts the friendlier CLI on the Mac too (`ntfy publish --title "Deploy" desk "done"` — same effect; the Homebrew formula is the CLI, which is all macOS officially supports anyway).

## The one-line end-to-end test

From *any* machine on the tailnet — Mac, either Linux box, whatever:

```bash
curl -H "Title: Rig check" -H "Priority: high" -H "Tags: rocket" \
     -d "if this buzzes, the arrow works" \
     http://100.x.y.z:8090/desk
```

Phone buzzes within a second or two (Tailscale on, app subscribed) → the whole system is proven, and Part 3 is just decorating it. Want to see what the phone is receiving without unlocking anything? The same endpoint reads back:

```bash
curl -s "http://100.x.y.z:8090/desk/json?poll=1" | python3 -m json.tool
```

That returns the cached messages — ID, timestamp, title, body, priority — exactly what the app is rendering. Both of these were run live while writing this; the JSON you get back is the same shape the server hands the phone.

---

# Part 3 — Wire it into real work

## The one helper worth keeping

A five-line shell function, same file on both machines (`~/.zshrc` on the Mac, `~/.bashrc` on Ubuntu), turns every long-running command into a notifying one:

```bash
pingdesk() {
  # usage: pingdesk ./build.sh    (or: pingdesk make test)
  "$@" \
    && curl -sf -H "Title: ✓ done"    -H "Tags: white_check_mark" \
         -d "finished: $*" http://100.x.y.z:8090/desk \
    || curl -sf -H "Title: ✗ FAILED" -H "Priority: urgent" -H "Tags: fire" \
         -d "exit $? — $*" http://100.x.y.z:8090/desk
}
```

Then `pingdesk ./build.sh`, `pingdesk npm test`, `pingdesk ./migrate.sh` — walk away; the verdict finds you. The failure branch carries the exit code and uses `Priority: urgent`, which Android renders as a high-importance notification. (Whether an urgent one breaks through Do-Not-Disturb is your phone's DND settings, not ntfy's promise — set it consciously on the device if you want the 2 a.m. page to actually wake you.)

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

ntfy's priority runs 1–5 (`min`, `low`, `default`, `high`, `urgent`) — reserve 4–5 for "act now," or the phone trains you to ignore it. Tags render as emoji on the notification itself (`fire`, `white_check_mark`, `floppy_disk`, `skull`), a free visual triage layer. `Title:` is the bold line; the `-d` body is the detail. The full header set — `Click:` to attach a URL, `Attach:` for files, even `At:`/`In:` for scheduled delivery — is in the [publish docs](https://docs.ntfy.sh/publish/).

## Alternatives, honestly

| Option | Infra | Sound | Where your message travels |
|---|---|---|---|
| **ntfy self-hosted** (this post) | one container/apt on Ubuntu | ✅ native | Your tailnet only. Nothing leaves. |
| ntfy.sh public topics | none | ✅ native | ntfy.sh's servers; topic name *is* the password — use an unguessable one |
| Telegram bot | none (bot token via BotFather, one `curl`) | ✅ native | Telegram's cloud |
| Pushover | none, $5 one-time per platform | ✅ native | Pushover's cloud |

The self-hosted row is the only one where the message never leaves machines you control — which is the same instinct behind B-26's "no vendor cloud in the control path." The others are legitimate shortcuts; take them knowingly. (KDE Connect can also mirror desktop notifications to an Android phone over an IP you give it, tailnet IPs included per community reports — plausible, elegant, and untested on this rig, so it stays a footnote rather than a recommendation.)

---

# Part 4 — Reference: troubleshooting & security

## Symptom → cause → fix

| Symptom | Cause | Fix |
|---|---|---|
| Publish works, JSON receipt comes back, phone silent | App never subscribed to the *self-hosted* server (default is ntfy.sh) | Re-check the subscription URL: `http://100.x.y.z:8090/desk`, exact topic, exact port |
| Works, then randomly stops for hours | Android battery optimization killed the connection | Exempt ntfy from battery optimization; keep the foreground-service notification enabled |
| Nothing anywhere, even `curl` from the box fails | Server down / wrong port | `docker ps` or `systemctl status ntfy`; test with `curl -d hi http://localhost:8090/desk` |
| Works on home WiFi, dead on cellular | Phone's Tailscale is off | Same B-26 check: the key icon, `tailscale status` from a desk |
| Mac's curl times out, phone fine | Mac left the tailnet | `tailscale status` on the Mac; the Ubuntu box's line must show connected |
| Message arrives but hours late | Phone was off / doze without foreground service | Reconnect; the 12h cache backfills what was missed — that's the cache file earning its keep |
| "Connection refused" from curl | Right IP, server not listening on 8090 | Re-run the docker run / check `ss -tlnp \| grep 8090` |

## Security recap

- **The server is only as exposed as you make it.** With `-p 8090:80`, the port answers on the Ubuntu box's home-LAN IP *and* its tailnet IP — the same trust posture as B-26's port 5900, fine behind a home router. Want it tailnet-only? Bind it: `-p 100.x.y.z:8090:80` (the box's tailnet IP), or firewall it to the tailscale interface (`ufw allow in on tailscale0 to any port 8090`).
- **Inside the tailnet, traffic is WireGuard-encrypted anyway** — plain HTTP to the tailnet IP is encrypted in transit by the tunnel. TLS on top (via a reverse proxy or `tailscale serve`) is polish, not a hole.
- **Self-hosted ntfy runs without accounts by default** — correct for a tailnet-only deployment, because reaching the port already required being one of *your* devices. If you ever expose it beyond the tailnet, add ntfy's access-control (`auth-file`) first; topic names are not secrets a stranger can't guess.
- **Never port-forward 8090 to the internet.** Same rule as 5900 in B-26, same reason: the tailnet already reaches everywhere you are.

## Escape hatches

- **No Ubuntu box, Mac only?** ntfy's server doesn't run on macOS — host on any always-on Linux thing (a Pi is ideal), or accept the ntfy.sh/Telegram trade-off table above.
- **Hate self-hosting anything?** The `curl` shape of this entire post works unchanged against `https://ntfy.sh/your-unguessable-topic` — swap the URL, keep every one-liner. You lose "never leaves your machines," gain nothing to maintain.
- **Need the actual audio, not the notification?** Re-read Part 1's "what would actually get me audio" — it's a different rig, and now you know exactly why.

---

# Where this landed

Verified live while writing: the ntfy server in a container, publishes with `Title`/`Priority`/`Tags` headers, and the `/json?poll=1` read-back — the exact commands above, JSON receipts and all, on a Linux box. From the official docs, not live on this rig: the Android app's self-hosted subscribe flow and foreground-service instant delivery, and the iOS `upstream-base-url` behavior — each linked where claimed, and the one-line end-to-end test in Part 2 is the 30-second check that converts "documented" to "true on my phone."

What this adds to the B-26 rig is the missing direction. The pocket could already reach the desk; now the desk can reach the pocket — in ~40 bytes instead of a video stream, through a channel that makes no sound of its own because it borrows the phone's, and at a price of one `docker run`. The couch was already a valid place to get something done. Now it's also a valid place to *not watch* something get done — the build will call you when it matters.

---

## Tools & licenses

| Tool | Role | License / cost |
|---|---|---|
| [ntfy](https://github.com/binwiederhier/ntfy) | Notification server + publish CLI + phone apps | Apache-2.0 / GPL-2.0 mixed; server and apps free, no account needed for self-host |
| [Tailscale](https://tailscale.com/) | The transport (unchanged from B-26) | Free personal plan; WireGuard end-to-end |
| curl | The publisher, both OSes | Ships with macOS and Ubuntu |
| [RealVNC Viewer](https://www.realvnc.com/en/connect/download/viewer/) | Referenced (the rig it extends) | Free for personal use, direct-connection mode |
| [x11vnc](https://github.com/LibVNC/x11vnc), macOS Screen Sharing | Referenced (whose audio limits Part 1 documents) | GPL-2.0 / built-in |

Sources for the no-audio claims, all cited in place: [RealVNC — Audio in RealVNC Connect](https://help.realvnc.com/hc/en-us/articles/360002504358-Audio-in-RealVNC-Connect) · [x11vnc FAQ Q-129](https://github.com/LibVNC/x11vnc/blob/master/doc/FAQ.md) · [RealVNC Lite plan](https://www.realvnc.com/en/connect/plan/lite/) · [Apple — High Performance screen sharing](https://support.apple.com/guide/remote-desktop/use-high-performance-screen-sharing-apdf8e09f5a9/mac).

---

## Let's Connect

Thank you for the time — genuinely. If you try any of this, I'd rather hear what broke than what worked:

- **Website**: [encryptioner.github.io](https://encryptioner.github.io)
- **LinkedIn**: [Mir Mursalin Ankur](https://www.linkedin.com/in/mir-mursalin-ankur)
- **GitHub**: [@Encryptioner](https://github.com/Encryptioner)
- **X (Twitter)**: [@AnkurMursalin](https://twitter.com/AnkurMursalin)
- **Technical Writing**: [Nerddevs](https://nerddevs.com/author/ankur/)
- **Support**: [SupportKori](https://www.supportkori.com/mirmursalinankur)
