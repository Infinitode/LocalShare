# LocalShare

LocalShare is a peer-to-peer file-sharing web app that was built entirely with vanilla HTML, CSS, and JS.

## Latest Changes

- Automatic nearby discovery using IPify-based room grouping and in-browser room host registry.
- Connection acceptance now reflects on both devices reliably.
- Richer transfer details (percent + bytes).
- Built-in room chat with sender names.
- Updated UI with stronger secondary color accents.

## Getting Started

You can clone LocalShare using Git.

```bash
git clone https://github.com/Infinitode/LocalShare.git
cd LocalShare
```

Or view and use the live web demo at https://local-share.netlify.app/.

## Features

- **Peer to peer file sharing**: Files transfer directly between devices.
- **Local room discovery**: Devices in the same IPify-derived room discover each other automatically.
- **Direct connect fallback**: Devices outside the room can still connect via Peer ID.
- **Connection handshake**: Incoming connections require accept/reject confirmation.
- **Room chat**: Lightweight chat for connected peers.
- **Detailed transfer status**: Progress bars include percentage and byte counters.

## Contributing

Contributions are welcome! If you encounter any issues, have suggestions, or want to contribute to LocalShare, please open an issue or submit a pull request on [GitHub](https://github.com/infinitode/LocalShare).

## License

LocalShare is released under the terms of the **MIT License (Modified)**. Please see the [LICENSE](https://github.com/infinitode/LocalShare/blob/main/LICENSE) file for the full text.

**Modified License Clause**

The modified license clause grants users the permission to make derivative works based on the LocalShare software. However, it requires any substantial changes to the software to be clearly distinguished from the original work and distributed under a different name.
