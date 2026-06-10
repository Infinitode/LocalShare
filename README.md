# LocalShare

LocalShare is a zero-configuration, peer-to-peer file-sharing and messaging web application built entirely with vanilla HTML, CSS (Tailwind CSS), and JavaScript. It uses WebRTC via PeerJS to allow devices on the same network to securely discover each other and transfer files directly without an intermediary server.

## Features

- **P2P Direct File Sharing:** Files transfer directly between devices with end-to-end data channels.
- **Zero-Config Local Discovery:** Devices sharing a public IP address automatically discover and list each other inside a local network room without user configuration.
- **Failover Room Registry:** Intelligent orchestration automatically elects a single device as a "Room Host Liaison" to synchronize the network roster, while smoothly transitioning roles if the host disconnects.
- **Secure Connection Handshakes:** Safeguards privacy by forcing explicit "Accept / Reject" confirmations before establishing file-sharing authorization.
- **Detailed Transfer Metrics:** Real-time visual progress monitoring including accurate speed tracking, percentage completion, and transfer byte gauges.
- **Persistent Room Chat:** A lightweight, encrypted, in-room messaging board for communication between connected network peers.
- **Manual Peer ID Fallback:** Outside of local subnets? Seamlessly bridge connections across any network via direct Peer ID input or QR-code scanning.

## Latest Architecture Updates

- **Migrated to Single-Target Failover Architecture:** Completely removed legacy multi-slot scanning loops and backoff synchronization. Devices now target a unified room host profile, defaulting smoothly to client mode upon collision to ensure instant, quiet discovery initialization.
- **Eliminated PeerJS Console Errors:** Implemented strict error exclusions and optimized connection lifecycle management to keep browser console logs perfectly clean from empty network scanning warnings.
- **Bi-Directional Network Syncing:** The elected room host acts as a local routing registry, immediately broadcasting the source-of-truth network roster to all active connections in milliseconds.
- **Enhanced Connection State Visibility:** Connection approvals and connection dropouts now update real-time state flags on both devices simultaneously and reliably.
- **Modern Dark-Mode Accent UI:** Streamlined user layout utilizing high-contrast cyan elements, unified typography, and embedded fluid transfer states.

## Getting Started

### Use the Live App
You can use the live web deployment instantly at:  
👉 **[https://local-share.netlify.app/](https://local-share.netlify.app/)**

### Local Setup
To clone and preview LocalShare on your own machine using Git:

```bash
# Clone the repository
git clone [https://github.com/Infinitode/LocalShare.git](https://github.com/Infinitode/LocalShare.git)

# Navigate into the project directory
cd LocalShare

# Open index.html in your preferred web browser or local live server environment

```

## How It Works Under the Hood

1. **Room Assignment:** LocalShare requests your public IP through a secure, lightweight Ipify query, hashing it into a deterministic `#room-id`.
2. **Evolving Roles:** The first device to enter a network room successfully binds to `ls-roomhost-[room-id]`. Any subsequent tabs or devices attempting to grab that string recognize that the slot is active and immediately pair with it as clients.
3. **The Mesh Liaison:** Clients transmit their true, randomized UUIDs (`ls-[room-id]-[UUID]`) to the host. The host aggregates this list and instantly flashes it back to all local browser contexts, establishing automated mesh visibility.

## Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you encounter a bug, have optimization suggestions, or want to contribute new code blocks:

1. Open an issue detailing your observation or proposal on [GitHub](https://github.com/infinitode/LocalShare).
2. Fork the Project.
3. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
4. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
5. Push to the Branch (`git push origin feature/AmazingFeature`).
6. Open a Pull Request.

## License

LocalShare is released under the terms of the **MIT License (Modified)**. Please see the [LICENSE](https://github.com/infinitode/LocalShare/blob/main/LICENSE) file for the full text.

**Modified License Clause** The modified license clause grants users permission to create derivative works based on the LocalShare software. However, it explicitly requires any substantial alterations to the software to be clearly distinguished from the original work and distributed under a completely different name.