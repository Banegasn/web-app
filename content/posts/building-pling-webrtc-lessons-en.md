---
id: "building-pling-webrtc-lessons-en"
title: "What I'm learning while building Pling with WebRTC"
seoTitle: "Building a Google Meet and Zoom Alternative with WebRTC: Lessons from Pling"
summary: "My field notes from building Pling: peer-to-peer calls, ideas that looked good until I tested them, rebellious audio, and the still-open challenge of live translation with WebGPU."
createdAt: "2026-07-20 16:25:00"
imageUrl: "images/pling-webrtc-en.jpg"
tags: "WebRTC, Pling, Video Meetings, Peer-to-Peer, Google Meet, Zoom, Screen Sharing, Audio, In-Browser AI"
keywords: "build Zoom alternative, Google Meet alternative WebRTC, WebRTC peer to peer video calls, WebRTC mesh architecture, build video meeting app, Pling"
language: "en"
translationGroup: "building-pling-webrtc-lessons"
---

# What I'm learning while building Pling with WebRTC

**[👉 Try Pling](https://pling.banegasn.dev/)** — Create a browser-based room with no account, download, or meeting timer.

The first video call you build with WebRTC is a charming little trap. You open two tabs, allow camera and microphone access, exchange an offer and answer, and suddenly your face appears on the other side. For a few minutes, you think: “Well, perhaps Zoom was not that complicated after all.”

Then you invite an actual person.

The browser picks the wrong microphone. A background tab freezes the video. The audio graph looks flawless while the call sounds like a robot speaking from inside a tin can. And that “free” feature starts charging you in CPU, battery, or bandwidth.

That is where **Pling** really begins: a free, peer-to-peer app for small meetings that I am building for people who want to open a link, talk, and leave without creating an account or watching a timer glare at them from the corner.

This is not a definitive WebRTC guide. It is closer to a field journal: decisions that worked, ideas I had to delete, and problems still sitting in the backlog looking remarkably relaxed.

---

## WebRTC connects media. The meeting is your job

My first lesson was separating two things that initially look the same: **delivering audio and video** and **making a meeting work**.

WebRTC solves an extraordinarily difficult part of the problem: it captures media, encrypts it, and transports it between browsers with low latency. It does not create rooms, decide who should make an offer, synchronize someone's mute state, or handle messages, reactions, and reconnections without a little help.

In Pling, NestJS and Socket.IO coordinate presence and signaling. SDP offers, answers, ICE candidates, and a small amount of ephemeral room state travel through that channel. Audio, camera video, and screen sharing travel between participants through WebRTC.

This dismantled a very convenient assumption: **peer-to-peer does not mean “serverless.”** Signaling is still required. STUN helps browsers discover a route, while TURN steps in when a corporate network, CGNAT, or mobile connection decides there will be no direct path today. P2P reduces media infrastructure; it does not remove the internet or its opinions.

## One formula decides when your laptop prepares for takeoff

Pling currently uses a mesh topology: every participant keeps a connection to every other participant. The number of pairs grows as:

`n × (n - 1) / 2`

Two people need one connection. Eight need 28 pairs, every browser maintains seven peers, and there are 56 directed video flows when both directions are counted. The server does not pay to mix video, but every device pays in upload bandwidth, CPU, battery, and heat.

That formula ended up defining a product decision: Pling limits rooms to eight people and adapts video to room size. A small room can prioritize high definition; as more people arrive, it reduces camera bitrate, frame rate, and resolution.

I built a smoke test that opens eight headless Chrome participants and verifies the full mesh. One run kept all 56 inbound and 56 outbound flows active with no packet loss, dropped frames, or frozen time. The laptop did not take off, but its fan gave the idea serious consideration.

It validated the code and my computer, not the internet. Sub-millisecond local latency does not represent eight real devices on real networks. **The internet does not live on localhost**, no matter how much our tests enjoy pretending it does.

If Pling needs to grow beyond small conversations, the next jump will not be another CSS or bitrate tweak. It will probably be an **SFU**, where each person publishes once and the server forwards an appropriate layer to each receiver.

## The first real call finds every lie in the prototype

During a call with a coworker, I discovered that the browser had selected the wrong microphone and speakers. My implementation worked; the conversation did not. It is a remarkably efficient way to recover your humility.

Pling now enumerates cameras, microphones, and outputs, remembers the user's choice, and lets them switch devices during a call by replacing the published track. Even that has caveats: audio-output selection relies on `setSinkId`, which is not equally available across browsers.

The pattern has repeated across other features. The browser is not a neutral pipe; it is the real operating system of a WebRTC app. Its permissions, codecs, autoplay policies, available APIs, and power-saving decisions are part of the architecture, even when they are missing from the nice diagram.

I learned this very visibly after adding video filters. The “Studio” mode processed the camera through a canvas and looked great… until the user changed tabs. Chrome throttled background canvas rendering, so everyone else received a frozen frame: an accidental profile picture in the middle of a meeting.

The fix was to make the raw camera the safe default, disable the filter when the page becomes hidden, and explicitly resume video when the user returns. A visual improvement is not an improvement if it can stop the conversation.

## Screen sharing should not make the person disappear

My first screen-sharing implementation replaced the camera track using `replaceTrack`. It was simple, common in demos, and rather bad for meetings: the moment someone shared their screen, their face vanished.

Pling now publishes the screen through a second `RTCRtpSender` and displays it as a separate tile. That required handling renegotiation, late joiners, recording both video sources, and manual or automatic capture ending. It also changed the room design: a new presentation receives focus once, but the interface then respects someone's decision to minimize it.

Quality needs intent. During a presentation, readable text matters more than a camera running at 24 fps. In small rooms, Pling can give the screen up to 2.5 Mbps and 20 fps while temporarily reducing cameras to 300–500 Kbps and 12–15 fps. Normal profiles return when sharing ends.

The idea was good; my first version was not. An accidental five-thumbnail limit hid some cameras, and overly aggressive reduction made another camera appear to have disappeared. Giving a screen priority cannot mean removing people from the meeting. It sounds obvious now that I have written it down. It was less obvious before.

## Audio: three booleans and a false sense of security

Pling began by requesting `echoCancellation`, `noiseSuppression`, and `autoGainControl`. They are a reasonable baseline, but one noisy call reminded me that “enabled” does not mean “solved.”

I added a Web Audio chain for voice leveling, EQ, and peak limiting, plus an advanced RNNoise and WebAssembly option. Then the opposite problem appeared: processing could swallow the beginning or end of a word.

I tried a very low parallel mix of the original signal, delayed by about 13 ms to preserve soft consonants. The automated tests passed. The graph looked beautiful. Listening to it revealed an intense whine, and my ears filed a formal complaint. I reverted the change.

It is one of the project's most valuable lessons: **an audio graph can be technically correct and sound awful**. This product needs tests, metrics, and human ears. Perceived quality does not fit entirely inside a unit-test suite.

## “Free” for the server is not free for everyone

I wanted to offer recording without paying for storage or video processing. The solution was not to upload the recording.

The recording participant's browser composes video on a canvas, mixes audio tracks, and generates a WebM through `MediaRecorder`. Where the API is supported, it writes chunks directly to a file chosen by the user; other browsers buffer them temporarily and download the result when recording stops. Pling never stores that video.

The hard part was not `MediaRecorder`. It was what recording means. A local file still contains other people. The room therefore shares recording state, displays a visible indicator, and asks for explicit confirmation. **Local processing does not remove the need for consent.**

I am applying the same idea to captions. A Whisper model runs in the browser and uses WebGPU when the device supports it. Each participant who enables captions processes their own microphone and sends only speaker-labelled text to the room. No audio needs to reach a transcription service.

And this is where I reach the part for which I still do not have a neat answer: **live transcription and translation with WebGPU**.

On an older computer, the model takes longer to load, and the user's GPU, memory, and battery become part of the cost. My first automatic-language mode even translated a Spanish sentence into English when it was only supposed to transcribe it. The system decided to be helpful in a way nobody had requested.

Forcing `task: transcribe` and detecting each utterance's language from Whisper's logits improves the behavior, but it does not magically create reliable simultaneous translation. Live translation means dealing with latency, incomplete sentences, language changes mid-utterance, corrections when more context arrives, and devices with wildly different capabilities.

I also need to decide where that work belongs: on every device, distributed between participants, or in an external fallback service. Every option changes cost, privacy, and experience. Local captions are a useful beta today. Live translation remains an open problem that needs more design, more testing, and probably an idea I have not had yet.

## The architecture I deleted still counts

At one point, I tried to make a single device transcribe the entire meeting. The server elected a transcriber and could promote a replacement if it left. It worked technically, which is one of the more dangerous sentences in software development.

It concentrated GPU load, created queues during overlapping speech, complicated failover, and made one participant process everyone's voices. It did not fit Pling's promise, so I removed it.

That step backward mattered as much as any feature. Designing an alternative to Meet or Zoom is not about copying a feature list. It is about deciding which responsibilities fit the product and which ones contradict it.

Pling promises a small, immediate room that respects its participants' data. That is why chat is ephemeral, recordings remain local, and captions originate on the device. Optional meeting summaries do use an external model, but they are protected by short-lived authorizations, strict quotas, and a backend that never exposes its API key to the browser. “Private” does not mean pretending there are no tradeoffs; it means making them visible and reducing them.

## I am not building a pocket-sized Zoom

Pling is not trying to replace a webinar for hundreds of people, enterprise administration, or a cloud recording library. It is an alternative for a different moment: up to eight people who want to open a link, talk, and leave without creating an account or watching a timer.

That limitation is not an apology. It is part of the design.

Now comes much more testing outside the lab: phones that lock their screens, connections moving between Wi-Fi and mobile data, networks that force TURN, and modest devices that cannot comfortably run Whisper. I also want to use `getStats()` to adapt quality from real evidence without turning observability into surveillance.

What keeps me hooked on building Pling is that WebRTC forces me to think about the whole system at once. Networking, interface design, privacy, accessibility, and cost stop being separate layers. Every decision that improves one can damage another with admirable efficiency.

The alternative I want to design will not be the one with the most buttons. It will be the one that makes all of this complexity disappear during a good conversation.

If you are building something similar—or have survived a particularly absurd WebRTC battle—the comments are open. I am far more interested in a real story than another list of “best practices.”

## Links

- **[Open Pling](https://pling.banegasn.dev/)** — Create or join a room
- **[Why I'm building Pling](/blog/pling-en)** — The idea and motivation behind the project
- **[About Pling](https://pling.banegasn.dev/about)** — Privacy, operation, and purpose
