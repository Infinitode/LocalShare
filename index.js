document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const popup = document.getElementById("popup");
    const popupText = document.getElementById("popup-text");
    const themeToggleButton = document.getElementById("theme-toggle");
    
    const statusEl = document.getElementById("status");
    const peerList = document.getElementById("peer-list");
    const nearbyList = document.getElementById("nearby-list");
    const fileInput = document.getElementById("file-input");
    const fileListUi = document.getElementById("file-list");
    const selectedCount = document.getElementById("selected-count");
    const sendButton = document.getElementById("send-button");
    const sendProgressList = document.getElementById("send-progress-list");
    const receivedFiles = document.getElementById("received-files");
    const transfersSection = document.getElementById("transfers-section");
    const outgoingCard = document.getElementById("outgoing-card");
    const receivedCard = document.getElementById("received-card");
    
    const peerIdInput = document.getElementById("peer-id-input");
    const connectButton = document.getElementById("connect-button");
    const qrCodeCanvas = document.getElementById("peer-id-qr-code");
    const qrCodeContainer = document.getElementById("qr-code-container");
    
    const handshakeModal = document.getElementById("handshake-modal");
    const handshakeMessage = document.getElementById("handshake-message");
    const handshakeAccept = document.getElementById("handshake-accept");
    const handshakeReject = document.getElementById("handshake-reject");

    // --- State ---
    const adjectives = ["Sparkly", "Fluffy", "Happy", "Brave", "Clever", "Witty", "Sunny", "Cozy", "Gentle", "Lucky"];
    const nouns = ["Panda", "Unicorn", "Kitten", "Puppy", "Fox", "Badger", "Sparrow", "Dolphin", "Otter", "Rabbit"];
    
    function generateCuteName() {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 90) + 10;
        return `${adj} ${noun} ${num}`;
    }

    let localPeerName = generateCuteName();
    let peer = null;
    const connections = {}; // { peerId: { conn, name, status: 'pending'|'active' } }
    let selectedFiles = [];
    const incomingTransfers = {}; // { "peerId:fileName": { buffer: [], receivedBytes, totalSize, element } }
    let nearbyRoomId = "global"; // Default
    let nearbyScanTimer = null;

    // --- Theme Removed (Dark Mode Only) ---

    // --- Utilities ---
    function displayPopup(message) {
        popupText.textContent = message;
        popup.classList.add("show");
        setTimeout(() => popup.classList.remove("show"), 3000);
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024, dm = 2, sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function updateTransferVisibility() {
        const hasOutgoing = sendProgressList.children.length > 0;
        const hasReceived = receivedFiles.children.length > 0;

        outgoingCard.classList.toggle("hidden", !hasOutgoing);
        receivedCard.classList.toggle("hidden", !hasReceived);
        transfersSection.classList.toggle("hidden", !hasOutgoing && !hasReceived);
    }

    // --- Nearby Discovery Logic ---
    // We use a shared prefix based on Public IP to simulate "Nearby"
    async function initDiscovery() {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            // Hash the IP to create a Room ID (using simple btoa for vanilla JS)
            nearbyRoomId = btoa(data.ip).substring(0, 8);
            console.log("Nearby Room ID:", nearbyRoomId);
        } catch (e) {
            console.warn("Could not get IP for discovery, using global room.");
        }
        initPeer();
    }

    function initPeer() {
        // Create Peer with discovery-friendly ID pattern: localshare-ROOM-RANDOM
        const randomId = Math.random().toString(36).substring(2, 7);
        const peerId = `ls-${nearbyRoomId}-${randomId}`;
        
        peer = new Peer(peerId, {
            debug: 2
        });

        peer.on("open", (id) => {
            console.log("Peer Open:", id);
            statusEl.innerHTML = `
                <span class="text-primary font-bold text-lg">${localPeerName}</span>
                <div class="flex items-center gap-2 mt-1">
                    <code class="text-xs text-text/30 bg-white/5 px-2 py-1 rounded-md border border-white/5">${id}</code>
                    <button id="copy-id" class="text-text/40 hover:text-primary transition-colors"><i class="bi bi-copy"></i></button>
                </div>
            `;
            document.getElementById("copy-id").onclick = () => {
                navigator.clipboard.writeText(id);
                displayPopup("Peer ID copied!");
            };
            displayQrCode(id);
            startNearbyScan();
        });

        peer.on("connection", (conn) => {
            console.log("Incoming connection from:", conn.peer);
            handleIncomingConnection(conn);
        });

        peer.on("error", (err) => {
            console.error("PeerJS Error:", err);
            displayPopup(`Error: ${err.type}`);
        });
    }

    function displayQrCode(id) {
        QRCode.toCanvas(qrCodeCanvas, id, {
            width: 140,
            margin: 0,
            color: { dark: "#85c6e100", light: "#85c6e1" }
        });
    }

    // --- Connection & Handshake ---
    function handleIncomingConnection(conn) {
        const remoteName = conn.metadata?.name || "Unknown Device";
        
        // Handshake Logic
        handshakeMessage.innerHTML = `<strong>${remoteName}</strong> from your network wants to connect. Do you accept?`;
        handshakeModal.classList.remove("hidden");
        
        const cleanup = () => {
            handshakeModal.classList.add("hidden");
            handshakeAccept.onclick = null;
            handshakeReject.onclick = null;
        };

        handshakeAccept.onclick = () => {
            cleanup();
            console.log("Accepted handshake from:", conn.peer);
            conn.send({ type: 'handshake-response', accepted: true, name: localPeerName });
            setupConnection(conn, remoteName);
        };

        handshakeReject.onclick = () => {
            cleanup();
            console.log("Rejected handshake from:", conn.peer);
            conn.send({ type: 'handshake-response', accepted: false });
            setTimeout(() => conn.close(), 500);
        };
    }

    function setupConnection(conn, name) {
        const pid = conn.peer;
        connections[pid] = { conn, name, status: 'active' };
        
        conn.on("open", () => {
            displayPopup(`Connected to ${name}`);
            updatePeerListUi();
        });

        conn.on("data", (data) => {
            if (data.type === 'file-metadata') handleFileMetadata(data, pid);
            if (data.type === 'file-chunk') handleFileChunk(data, pid);
            if (data.type === 'peer-name') {
                connections[pid].name = data.name;
                updatePeerListUi();
            }
        });

        conn.on("close", () => {
            delete connections[pid];
            displayPopup(`${name} disconnected`);
            updatePeerListUi();
        });
    }

    function requestConnection(remoteId) {
        if (!remoteId || remoteId === peer.id) return;

        displayPopup(`Requesting handshake with ${remoteId}...`);
        const conn = peer.connect(remoteId, {
            metadata: { name: localPeerName, type: 'handshake' }
        });

        conn.on("data", (data) => {
            if (data.type === 'handshake-response') {
                if (data.accepted) {
                    displayPopup(`Connection accepted by ${data.name}`);
                    setupConnection(conn, data.name);
                } else {
                    displayPopup("Connection rejected by peer.");
                    conn.close();
                }
            }
        });
    }

    connectButton.addEventListener("click", () => {
        requestConnection(peerIdInput.value.trim());
    });

    // --- UI Updates ---
    function updatePeerListUi() {
        peerList.innerHTML = "";
        Object.entries(connections).forEach(([id, data]) => {
            const li = document.createElement("li");
            li.className = "connection-card p-4 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all";
            li.innerHTML = `
                <div class="identity-wrap flex items-center gap-3">
                    <div class="peer-icon w-10 h-10 rounded-xl flex items-center justify-center text-primary">
                        <i class="bi bi-laptop"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="peer-name text-sm font-bold">${data.name}</p>
                        <p class="peer-id text-[10px] text-text/40">${id}</p>
                    </div>
                </div>
                <button class="text-text/40 hover-secondary p-2 rounded-lg hover-secondary-bg transition-all opacity-0 group-hover:opacity-100" onclick="window.disconnectPeer('${id}')">
                    <i class="bi bi-x-lg"></i>
                </button>
            `;
            peerList.appendChild(li);
        });
        
        if (Object.keys(connections).length === 0) {
            peerList.innerHTML = `<li class="col-span-full border border-dashed border-white/10 rounded-2xl py-3 text-center text-text/40 text-xs italic">No active connections</li>`;
        }

        if (peer) scanNearbyPeers();
    }

    window.disconnectPeer = (id) => {
        if (connections[id]) connections[id].conn.close();
    };

    function renderNearbyPeers(peerIds) {
        if (!peerIds.length) {
            nearbyList.innerHTML = `
                <li class="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group">
                    <span class="text-xs text-text/60">Network ID: <strong>#${nearbyRoomId}</strong></span>
                    <span class="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full">Active</span>
                </li>
                <li class="text-xs text-text/40 italic py-4 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                    No nearby devices found yet
                </li>
            `;
            return;
        }

        nearbyList.innerHTML = `
            <li class="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group">
                <span class="text-xs text-text/60">Network ID: <strong>#${nearbyRoomId}</strong></span>
                <span class="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full">${peerIds.length} Found</span>
            </li>
        `;

        peerIds.forEach((id) => {
            const li = document.createElement("li");
            const isConnected = Boolean(connections[id]);
            li.className = "connection-card p-3 rounded-xl flex items-center justify-between gap-3";
            li.innerHTML = `
                <div class="min-w-0">
                    <p class="peer-name text-xs font-bold truncate">${id}</p>
                    <p class="peer-id text-[10px] text-text/40">Nearby device</p>
                </div>
                <button class="bg-primary hover:bg-primary/80 text-background px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap ${isConnected ? 'opacity-50 cursor-not-allowed' : ''}" ${isConnected ? 'disabled' : ''}>
                    ${isConnected ? 'Connected' : 'Connect'}
                </button>
            `;
            const button = li.querySelector("button");
            if (!isConnected) {
                button.addEventListener("click", () => requestConnection(id));
            }
            nearbyList.appendChild(li);
        });
    }

    async function scanNearbyPeers() {
        if (!peer || typeof peer.listAllPeers !== "function") {
            renderNearbyPeers([]);
            return;
        }

        try {
            const allPeers = await new Promise((resolve, reject) => {
                peer.listAllPeers((peers) => resolve(peers || []));
                setTimeout(() => reject(new Error("scan-timeout")), 3000);
            });
            const prefix = `ls-${nearbyRoomId}-`;
            const nearby = allPeers
                .filter((id) => id.startsWith(prefix) && id !== peer.id)
                .filter((id, idx, arr) => arr.indexOf(id) === idx);
            renderNearbyPeers(nearby);
        } catch (err) {
            console.warn("Nearby scan failed:", err);
            nearbyList.innerHTML = `
                <li class="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group">
                    <span class="text-xs text-text/60">Network ID: <strong>#${nearbyRoomId}</strong></span>
                    <span class="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full">Active</span>
                </li>
                <li class="text-[11px] text-text/40 py-4 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                    Nearby listing unavailable on this signaling server. Use Connect with Peer ID.
                </li>
            `;
        }
    }

    function startNearbyScan() {
        if (nearbyScanTimer) clearInterval(nearbyScanTimer);
        scanNearbyPeers();
        nearbyScanTimer = setInterval(scanNearbyPeers, 5000);
    }

    // --- File Handling ---
    fileInput.addEventListener("change", (e) => {
        selectedFiles = Array.from(e.target.files);
        renderSelectedFiles();
    });

    function renderSelectedFiles() {
        fileListUi.innerHTML = "";
        selectedCount.textContent = selectedFiles.length;
        
        if (selectedFiles.length === 0) {
            fileListUi.innerHTML = `<li class="text-[11px] text-text/40 text-center py-8">No files selected yet</li>`;
            return;
        }

        selectedFiles.forEach((file, index) => {
            const li = document.createElement("li");
            li.className = "flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-all";
            li.innerHTML = `
                <div class="flex items-center gap-3 overflow-hidden">
                    <i class="bi bi-file-earmark-text text-primary/70"></i>
                    <div class="truncate">
                        <p class="text-xs font-medium text-text truncate">${file.name}</p>
                        <p class="text-[10px] text-text/40">${formatBytes(file.size)}</p>
                    </div>
                </div>
                <button class="text-text/40 hover-secondary transition-colors" onclick="window.removeFile(${index})"><i class="bi bi-trash"></i></button>
            `;
            fileListUi.appendChild(li);
        });
    }

    window.removeFile = (idx) => {
        selectedFiles.splice(idx, 1);
        renderSelectedFiles();
    };

    // --- Sending Files ---
    sendButton.addEventListener("click", () => {
        if (!selectedFiles.length) return displayPopup("Select files first!");
        const peers = Object.values(connections);
        if (!peers.length) return displayPopup("Connect to a peer first!");

        selectedFiles.forEach(file => {
            peers.forEach(peerData => {
                sendFile(file, peerData);
            });
        });

        displayPopup(`Starting transfer of ${selectedFiles.length} files...`);
        selectedFiles = [];
        renderSelectedFiles();
    });

    function sendFile(file, peerData) {
        const { conn, name } = peerData;
        const safeName = file.name.replace(/\s+/g, '-');
        const transferId = `send-${conn.peer}-${safeName}`;
        
        // UI Entry
        const li = document.createElement("li");
        li.id = transferId;
        li.className = "transfer-card space-y-2 p-3 rounded-xl animate-in slide-in-from-right duration-300";
        li.innerHTML = `
            <div class="flex justify-between text-[10px]">
                <span class="text-text font-medium truncate w-32">${file.name}</span>
                <span class="text-primary font-bold">To ${name}</span>
            </div>
            <div class="track h-1.5 w-full rounded-full overflow-hidden">
                <div id="${transferId}-bar" class="h-full bg-primary w-0 transition-all duration-300"></div>
            </div>
        `;
        sendProgressList.appendChild(li);
        updateTransferVisibility();

        // Metadata
        conn.send({ type: 'file-metadata', fileName: file.name, totalSize: file.size });

        // Chunking
        const chunkSize = 16384 * 4; // 64KB
        let offset = 0;
        const reader = new FileReader();

        const sendChunk = () => {
            if (offset >= file.size) {
                setTimeout(() => li.classList.add("opacity-50", "scale-95"), 1000);
                return;
            }

            const slice = file.slice(offset, offset + chunkSize);
            reader.onload = (e) => {
                conn.send({
                    type: 'file-chunk',
                    fileName: file.name,
                    chunk: e.target.result,
                    isLast: offset + slice.size >= file.size
                });
                offset += slice.size;
                const pct = (offset / file.size) * 100;
                document.getElementById(`${transferId}-bar`).style.width = `${pct}%`;
                
                // Controlled recursion to avoid blocking
                setTimeout(sendChunk, 10);
            };
            reader.readAsArrayBuffer(slice);
        };

        sendChunk();
    }

    // --- Receiving Files ---
    function handleFileMetadata(data, peerId) {
        const key = `${peerId}:${data.fileName}`;
        const transferId = `recv-${peerId}-${data.fileName.replace(/\s+/g, '-')}`;
        
        const peerName = connections[peerId]?.name || "Peer";
        
        const li = document.createElement("li");
        li.id = transferId;
        li.className = "transfer-card space-y-2 p-3 rounded-xl animate-in slide-in-from-left duration-300";
        li.innerHTML = `
            <div class="flex justify-between text-[10px]">
                <span class="text-text font-medium truncate w-32">${data.fileName}</span>
                <span class="text-accent font-bold">From ${peerName}</span>
            </div>
            <div class="track h-1.5 w-full rounded-full overflow-hidden">
                <div id="${transferId}-bar" class="h-full bg-accent w-0 transition-all duration-300"></div>
            </div>
        `;
        receivedFiles.appendChild(li);
        updateTransferVisibility();

        incomingTransfers[key] = {
            buffer: [],
            receivedBytes: 0,
            totalSize: data.totalSize,
            element: li
        };
    }

    function handleFileChunk(data, peerId) {
        const key = `${peerId}:${data.fileName}`;
        const transfer = incomingTransfers[key];
        if (!transfer) return;

        transfer.buffer.push(data.chunk);
        transfer.receivedBytes += data.chunk.byteLength;
        
        const pct = (transfer.receivedBytes / transfer.totalSize) * 100;
        const transferId = `recv-${peerId}-${data.fileName.replace(/\s+/g, '-')}`;
        const bar = document.getElementById(`${transferId}-bar`);
        if (bar) bar.style.width = `${pct}%`;

        if (data.isLast) {
            const blob = new Blob(transfer.buffer);
            const url = URL.createObjectURL(blob);
            
            transfer.element.innerHTML = `
                <div class="flex items-center justify-between gap-3">
                    <div class="overflow-hidden">
                        <p class="text-xs font-bold text-text truncate">${data.fileName}</p>
                        <p class="text-[10px] text-text/40">Received from ${connections[peerId]?.name}</p>
                    </div>
                    <a href="${url}" download="${data.fileName}" class="bg-accent/20 text-accent p-2 rounded-lg hover:bg-accent/30 transition-all">
                        <i class="bi bi-download"></i>
                    </a>
                </div>
            `;
            delete incomingTransfers[key];
            updateTransferVisibility();
        }
    }

    // --- Kickoff ---
    initDiscovery();
});
