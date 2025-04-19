// index.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const DISCOVERY_ID = 'localshare-discovery-room-v1'; // ID for the discovery "hub"

    // --- Globals & DOM References ---
    // Peer instance - allow ID specification for the hub
    let peerId = undefined; // Default: let PeerJS generate
    let attemptedToBecomeHub = false; // Flag to track if this instance tried to be the hub initially

    // Basic check if someone tries to manually set the ID via URL hash
    if (window.location.hash === `#${DISCOVERY_ID}`) {
        peerId = DISCOVERY_ID;
        attemptedToBecomeHub = true; // Mark that we tried
        console.log(`Attempting to initialize with specific ID: ${DISCOVERY_ID}`);
        // Remove hash to avoid confusion and issues on reload
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }

    const peer = peerId ? new Peer(peerId) : new Peer();
    const connections = {}; // { peerId: DataConnection } - For DATA connections
    const fileInput = document.getElementById('file-input');
    const sendButton = document.getElementById('send-button');
    const fileList = document.getElementById('file-list');
    const status = document.getElementById('status');
    const peerList = document.getElementById('peer-list');
    const receivedFiles = document.getElementById('received-files'); // Holds progress bars too

    let selectedFiles = [];
    const sendProgressList = document.createElement('ul');
    sendProgressList.id = 'send-progress-list';
    fileList.parentNode.insertBefore(sendProgressList, fileList.nextSibling);

    // Buffer and progress tracking for incoming files
    const incomingTransfers = {}; // { "peerId:fileName": { buffer: [...], receivedBytes: 0, totalSize: 0, progressElement: Element } }

    // --- Discovery Hub State (only relevant if this peer IS the hub) ---
    let isHub = false;
    // Map to store connections *to* the hub from clients seeking discovery
    // Key: conn.label (unique ID for the connection), Value: { conn: DataConnection, realPeerId: string | null }
    const hubClients = new Map();

    // --- Discovery Client State (only relevant if this peer is NOT the hub) ---
    let discoveryHubConnection = null; // Stores the DataConnection *to* the hub

    // --- Function to prompt user to become the hub ---
    function promptToBecomeHub() {
        // Avoid prompting if:
        // - This instance IS the hub.
        // - This instance ALREADY tried to be the hub via hash and potentially failed (e.g., ID unavailable).
        // - Peer object isn't fully initialized yet.
        // - We are already connected to a hub (shouldn't happen if error triggered, but safe check)
        if (isHub || attemptedToBecomeHub || !peer.id || discoveryHubConnection?.open) {
            console.log("Skipping promptToBecomeHub check.");
            return;
        }

        // Use confirm() for simplicity; could be replaced with a custom, non-blocking modal
        const userAgrees = confirm(
            `The local discovery hub (${DISCOVERY_ID}) could not be found.\n\n` +
            `Do you want to start this browser tab as the hub so others can find you?\n\n` +
            `(Only one hub should run on the network. If someone else starts one later, you may need to refresh.)`
        );

        if (userAgrees) {
            console.log("User agreed to become the hub. Reloading with hash...");
            // Set the hash and reload the page. The 'DOMContentLoaded' listener
            // will pick up the hash on the next load and initialize as the hub.
            window.location.hash = DISCOVERY_ID;
            window.location.reload();
            // Execution stops here due to reload
        } else {
            console.log("User declined to become the hub.");
            // Update status to make it clear hub is needed but not running
             status.innerHTML += ' <span style="color: red;">(Hub required for auto-discovery)</span>';
        }
    }


    // --- Peer Setup ---
    peer.on('open', id => {
        console.log(`PeerJS initialized. Your ID: ${id}`);
        // Initial status update (will be refined by updatePeerList)
        status.innerHTML = `Your ID: <code>${id}</code> <button id="copy-id">Copy ID</button>`;
        document.getElementById('copy-id')?.addEventListener('click', () => copyPeerId(id));

        if (id === DISCOVERY_ID) {
            isHub = true;
            console.log("This peer instance is acting as the Discovery Hub.");
            // No need to connect to self, just wait for clients
        } else {
            // This is a regular client, attempt to find and connect to the discovery hub
            attemptConnectToHub();
        }
        updatePeerList(); // Update UI with initial status
    });

    peer.on('error', err => {
        console.error("PeerJS error:", err);
        let alertMsg = `An error occurred with PeerJS: ${err.type}`;
        let shouldPromptForHub = false; // Flag to trigger prompt *after* other logic

        if (err.type === 'peer-unavailable') {
            const attemptedPeer = err.message.match(/Could not connect to peer (.*?)$/);
            if (attemptedPeer && attemptedPeer[1] === DISCOVERY_ID) {
                 console.warn(`Discovery Hub (${DISCOVERY_ID}) not found or offline.`);
                 // Update status instead of alerting, as this is expected if hub isn't running
                 status.innerHTML += ' <span style="color: orange;">(Discovery Hub not found)</span>';
                 alertMsg = ''; // Don't alert for this specific case
                 // Set flag to prompt user *unless* this instance already tried to be the hub
                 if (!attemptedToBecomeHub) {
                    shouldPromptForHub = true;
                 }
            } else {
                 // Error connecting to a regular peer
                 alertMsg = `Could not connect to peer ${attemptedPeer ? attemptedPeer[1] : ''}. Peer ID might be incorrect or the peer is offline.`;
            }
        } else if (err.type === 'network') {
             alertMsg = `Network error. Please check your connection.`;
        } else if (err.type === 'unavailable-id' && err.message.includes(DISCOVERY_ID)) {
             // This happens if we *tried* to become the hub (via hash) but the ID was taken
             alertMsg = `Could not claim Discovery Hub ID (${DISCOVERY_ID}). Another hub might already be running. Refresh to connect as a client.`;
             // Ensure isHub is false if we failed to claim the ID
             isHub = false;
             attemptedToBecomeHub = true; // Record that the attempt was made and failed
        } else if (err.type === 'disconnected') {
             alertMsg = `Disconnected from the PeerJS signaling server. Please refresh.`;
        } else if (err.type === 'server-error') {
             alertMsg = `Error connecting to the PeerJS signaling server.`;
        }

        // Show alert only if a message was set
        if (alertMsg) alert(alertMsg);

         // Reset manual connection UI elements if they were in a connecting state
        const connectInput = document.getElementById('peer-id-input');
        const connectButton = document.getElementById('connect-button');
        if (connectInput) connectInput.value = ''; // Clear input on error
        if (connectButton && connectButton.textContent === 'Connecting...') {
            connectButton.disabled = false;
            connectButton.textContent = 'Connect';
        }
        updatePeerList(); // Reflect potential status changes

        // Trigger the prompt *after* handling other error logic and UI updates
        if (shouldPromptForHub) {
            // Use a small delay to allow the browser to process the alert/UI updates first
            setTimeout(promptToBecomeHub, 100);
        }
    });


    peer.on('connection', conn => {
        console.log(`Incoming connection from ${conn.peer} with metadata:`, conn.metadata);

        // --- Hub Logic: Handle incoming connections *if this instance is the hub* ---
        if (isHub) {
            // Check if it's a client trying to discover peers
            if (conn.metadata?.type === 'discovery-request') {
                console.log(`Hub: Received discovery request from client peer ${conn.peer} (connection label: ${conn.label})`);
                handleDiscoveryClient(conn);
            } else {
                // The hub generally doesn't accept direct data connections
                // unless specifically designed to relay data (which we aren't doing here).
                console.warn(`Hub: Received non-discovery connection from ${conn.peer}. Politely refusing.`);
                // Optionally send a message back explaining it's a hub?
                // conn.send({ type: 'error', message: 'Cannot connect directly to the discovery hub.' });
                setTimeout(() => conn.close(), 500); // Close the connection
            }
            return; // Hub logic is complete for this connection
        }

        // --- Normal Peer Logic: Handle incoming connections *if this instance is a client* ---

        // Ignore connections *initiated by* the hub itself (hub shouldn't initiate data connections)
        if (conn.peer === DISCOVERY_ID) {
            console.log(`Ignoring connection attempt *from* the discovery hub (${conn.peer}). Closing.`);
            conn.close();
            return;
        }

        // Accept normal incoming data connections from other peers (likely initiated via hub discovery)
        console.log(`Accepting data connection from peer ${conn.peer}`);
        setupConnection(conn); // Setup this as a standard data connection
    });

    // --- Dial-in UI (Manual Connection) ---
    const connectInput = document.createElement('input');
    const connectButton = document.createElement('button');
    connectInput.id = 'peer-id-input';
    connectInput.placeholder = 'Enter peer ID manually…';
    connectInput.style.marginRight = '8px';
    connectButton.id = 'connect-button';
    connectButton.textContent = 'Connect';
    document.getElementById('connection-section').append(connectInput, connectButton);

    connectButton.addEventListener('click', () => {
        const remoteId = connectInput.value.trim();
        if (!remoteId) return alert('Please enter a peer ID.');
        if (connections[remoteId]) return alert('Already connected to ' + remoteId);
        if (remoteId === peer.id) return alert("You cannot connect to yourself.");
        if (remoteId === DISCOVERY_ID) return alert(`Cannot connect directly to the Discovery Hub (${DISCOVERY_ID}). It is used only for automatic discovery.`);

        console.log(`Attempting to connect manually to ${remoteId}...`);
        connectButton.disabled = true;
        connectButton.textContent = 'Connecting...';

        // Initiate a direct data connection
        const conn = peer.connect(remoteId, { reliable: true });

        // Handle specific errors for this manual connection attempt
        conn.on('error', (err) => {
            console.error(`Manual connection error with ${remoteId}:`, err);
            alert(`Failed to connect to ${remoteId}. Error: ${err.type}`);
            // Reset button only if it's still in the connecting state for this specific peer
            if (connectInput.value === remoteId || connectButton.textContent === 'Connecting...') {
                 connectButton.disabled = false;
                 connectButton.textContent = 'Connect';
            }
        });

        // Let setupConnection handle the 'open' event and further setup
        setupConnection(conn);
    });

    // --- Connection Handler (for DATA connections ONLY) ---
    function setupConnection(conn) {
        const remotePeerId = conn.peer;

        // Prevent setting up duplicate connections or handling connections from the hub here
        if (remotePeerId === DISCOVERY_ID) {
            console.warn(`setupConnection called for the hub (${remotePeerId}). Ignoring.`);
            return;
        }
        if (connections[remotePeerId]) {
            console.log(`Already have an active data connection to ${remotePeerId}. Ignoring duplicate setup request.`);
            // If the incoming `conn` object is different from the stored one, close the new one.
            if (connections[remotePeerId] !== conn) {
                 conn.close();
            }
            return;
        }

        console.log(`Setting up data connection with ${remotePeerId}`);
        connections[remotePeerId] = conn; // Add to our active data connections
        updatePeerList(); // Update UI to show the new connection

        conn.on('open', () => {
            // This confirms the data channel is ready
            console.log(`Data connection established with ${remotePeerId}`);
            // Reset manual connection button state if it was the one initiating this specific connection
            const connectButton = document.getElementById('connect-button');
            const connectInput = document.getElementById('peer-id-input');
            if (connectButton && connectInput.value === remotePeerId) {
                 connectButton.disabled = false;
                 connectButton.textContent = 'Connect';
                 connectInput.value = ''; // Clear input after successful manual connection
            }
        });

        conn.on('data', data => handleData(data, conn)); // Handle incoming file chunks/other data

        conn.on('close', () => {
            console.log(`Data connection closed with ${remotePeerId}`);
            if (connections[remotePeerId]) {
                delete connections[remotePeerId]; // Remove from active connections
                updatePeerList(); // Update UI
                cleanupIncompleteTransfers(remotePeerId); // Clean up any pending transfers
            }
        });

        conn.on('error', (err) => {
             console.error(`Error on data connection with ${remotePeerId}:`, err);
             // Ensure cleanup happens even on error-driven close
             if (connections[remotePeerId]) {
                 delete connections[remotePeerId];
                 updatePeerList();
                 cleanupIncompleteTransfers(remotePeerId);
             }
        });
    }

    // --- Discovery Hub Connection Logic (Client-side: Connecting TO the Hub) ---
    function attemptConnectToHub() {
        // Don't attempt if this instance is the hub, already connected/connecting, or peer isn't ready
        if (isHub || discoveryHubConnection || !peer.id || peer.id === DISCOVERY_ID || attemptedToBecomeHub) return;

        console.log(`Attempting to connect to discovery hub: ${DISCOVERY_ID}`);
        updatePeerList(); // Show "Connecting to hub..." status

        // Use unreliable connection for discovery, metadata identifies the purpose
        const hubConn = peer.connect(DISCOVERY_ID, {
            reliable: false,
            metadata: { type: 'discovery-request' }
        });

        // Handle the connection lifecycle TO the hub
        hubConn.on('open', () => {
            console.log('Connected to discovery hub.');
            discoveryHubConnection = hubConn; // Store the active connection
            updatePeerList(); // Update status to "Connected to hub"
            // Announce our presence and actual Peer ID to the hub
            console.log(`Announcing self (${peer.id}) to the hub.`);
            hubConn.send({ type: 'announce', peerId: peer.id });
        });

        hubConn.on('data', (data) => {
            // Listen for lists of peers from the hub
            if (data.type === 'peer-list' && Array.isArray(data.peers)) {
                console.log('Received peer list from hub:', data.peers);
                data.peers.forEach(peerIdToConnect => {
                    // Connect only if it's not self, not the hub, and not already connected/connecting
                    if (peerIdToConnect !== peer.id &&
                        peerIdToConnect !== DISCOVERY_ID &&
                        !connections[peerIdToConnect] && // Check our established data connections
                        !peer.connections[peerIdToConnect]?.some(c => c.open || c.connecting)) // Check underlying PeerJS connections
                    {
                        console.log(`Hub suggests connecting to peer: ${peerIdToConnect}. Initiating data connection.`);
                        const dataConn = peer.connect(peerIdToConnect, { reliable: true }); // Initiate reliable DATA connection
                        setupConnection(dataConn); // Setup the data connection
                    }
                });
            } else {
                console.log('Received unknown data from hub:', data);
            }
        });

        hubConn.on('close', () => {
            console.warn('Disconnected from discovery hub.');
            if (discoveryHubConnection === hubConn) { // Ensure it's the current connection closing
                discoveryHubConnection = null;
                updatePeerList(); // Update status to "Hub disconnected"
                // Optional: Implement retry logic here if desired, but be careful
                // not to conflict with the promptToBecomeHub logic triggered by peer.on('error')
                // If the 'close' happens without an error, maybe a gentle retry is okay.
                // console.log('Will attempt to reconnect to hub in 10 seconds...');
                // setTimeout(attemptConnectToHub, 10000);
            }
        });

        hubConn.on('error', (err) => {
            // Note: Often, a connection error here (like 'peer-unavailable') will also trigger
            // the main peer.on('error') handler, which is where we added the prompt logic.
            // So, we might not need specific prompt logic *here*.
            console.error(`Discovery hub connection error: ${err.type}`);
            if (discoveryHubConnection === hubConn) {
                discoveryHubConnection = null;
                updatePeerList(); // Update status to show hub error
            }
            // No automatic retry or prompt here, rely on the main error handler
        });
    }

    // --- Discovery Hub Logic (Server-side: Handling clients connecting TO this Hub instance) ---
    function handleDiscoveryClient(conn) {
        // Use conn.label as a unique key for the client connection map
        const clientKey = conn.label;
        hubClients.set(clientKey, { conn: conn, realPeerId: null }); // Store client conn, initially without knowing its real ID
        console.log(`Hub: Client connected (Peer: ${conn.peer}, Label: ${clientKey}). Total clients: ${hubClients.size}`);

        // Handle messages received *from* this specific client
        conn.on('data', (data) => {
            const clientInfo = hubClients.get(clientKey);
            if (!clientInfo) return; // Should not happen if connection is open

            if (data.type === 'announce' && data.peerId) {
                console.log(`Hub: Received announce from Label ${clientKey}. Real Peer ID: ${data.peerId}`);
                // Store the actual Peer ID announced by the client
                clientInfo.realPeerId = data.peerId;
                broadcastPeerList(); // Announce the updated peer list to everyone
            } else {
                console.log(`Hub: Received unknown data from Label ${clientKey}:`, data);
            }
        });

        // Handle client disconnection
        conn.on('close', () => {
            console.log(`Hub: Client disconnected (Label: ${clientKey})`);
            if (hubClients.has(clientKey)) {
                hubClients.delete(clientKey);
                console.log(`Hub: Total clients: ${hubClients.size}`);
                broadcastPeerList(); // Announce removal
            }
        });

        // Handle errors on the connection to the client
        conn.on('error', (err) => {
            console.error(`Hub: Error on connection with Label ${clientKey}:`, err);
            if (hubClients.has(clientKey)) {
                hubClients.delete(clientKey);
                 console.log(`Hub: Total clients: ${hubClients.size}`);
                broadcastPeerList(); // Announce removal
            }
        });

        // Send the current list immediately to the newly connected client
        // (after a short delay to allow the 'announce' message to potentially arrive first)
        setTimeout(() => {
             const clientInfo = hubClients.get(clientKey);
             if (clientInfo && clientInfo.conn.open) { // Check if still connected
                 const peerListToSend = getPeerListArray(clientInfo.realPeerId); // Get list excluding self
                 console.log(`Hub: Sending initial peer list to ${clientInfo.realPeerId || clientKey}:`, peerListToSend);
                 try {
                    clientInfo.conn.send({ type: 'peer-list', peers: peerListToSend });
                 } catch (error) {
                     console.error(`Hub: Failed initial send to ${clientInfo.realPeerId || clientKey}:`, error);
                 }
             }
        }, 500); // Adjust delay if needed
    }

    // Helper function for the Hub to get the list of real Peer IDs
    function getPeerListArray(excludePeerId = null) {
        const peerList = [];
        for (const clientInfo of hubClients.values()) {
            // Only include clients that have announced their ID and are not the excluded ID
            if (clientInfo.realPeerId && clientInfo.realPeerId !== excludePeerId) {
                peerList.push(clientInfo.realPeerId);
            }
        }
        return peerList;
    }


    // Broadcast the current list of connected peer IDs to all clients connected to the hub
    function broadcastPeerList() {
        if (!isHub) return; // Only the hub broadcasts

        console.log(`Hub: Broadcasting peer list update to ${hubClients.size} clients.`);

        for (const [clientKey, clientInfo] of hubClients.entries()) {
            // Ensure the client has announced itself and the connection is open
            if (clientInfo.realPeerId && clientInfo.conn.open) {
                 // Get the list of peers, excluding the current recipient
                 const filteredList = getPeerListArray(clientInfo.realPeerId);
                 try {
                     console.log(`Hub: Sending list to ${clientInfo.realPeerId}:`, filteredList);
                     clientInfo.conn.send({ type: 'peer-list', peers: filteredList });
                 } catch (error) {
                      console.error(`Hub: Failed to send peer list to ${clientInfo.realPeerId} (Label: ${clientKey}):`, error);
                      // Consider closing connection or removing client if send fails repeatedly
                 }
            }
        }
    }


    // --- UI Updates & Utilities ---

    function copyPeerId(id) {
        if (!id) return;
        navigator.clipboard.writeText(id).then(() => {
            const copyButton = document.getElementById('copy-id');
            if (!copyButton) return;
            const originalText = copyButton.textContent;
            copyButton.textContent = 'Copied! 👍';
            setTimeout(() => {
                // Check if the button still exists before resetting text
                const currentCopyButton = document.getElementById('copy-id');
                if (currentCopyButton) {
                    currentCopyButton.textContent = originalText;
                }
            }, 1500);
        }, (err) => {
            console.error('Failed to copy ID: ', err);
            alert('Failed to copy ID.');
        });
    }

    function updatePeerList() {
        // --- Update Status Line ---
        let statusContent = '';
        if (peer.id) {
            statusContent = `Your ID: <code>${peer.id}</code> <button id="copy-id">Copy ID</button>`;
            if (isHub) {
                statusContent += ' <span style="color: blue;">(Acting as Discovery Hub)</span>';
            } else if (discoveryHubConnection?.open) {
                statusContent += ' <span style="color: green;">(Connected to Hub)</span>';
            } else if (!discoveryHubConnection && !isHub && !attemptedToBecomeHub) { // Only show connecting/not found if not the hub and didn't fail to become hub
                // Check if we are in the process of connecting
                const hubConnAttempt = peer.connections[DISCOVERY_ID]?.[0]; // PeerJS stores connections in arrays
                if (hubConnAttempt?.connecting) {
                     statusContent += ' <span style="color: orange;">(Connecting to Hub...)</span>';
                } else {
                     // Check if an error occurred related to the hub previously
                     const existingStatus = status.innerHTML; // Read current status before overwriting
                     if (!existingStatus.includes('(Discovery Hub not found)') && !existingStatus.includes('(Hub required for auto-discovery)')) {
                         statusContent += ' <span style="color: grey;">(Hub Disconnected/Not Found)</span>';
                     } else {
                         // Preserve the more specific error message if already shown
                         if (existingStatus.includes('(Discovery Hub not found)')) {
                             statusContent += ' <span style="color: orange;">(Discovery Hub not found)</span>';
                         }
                         if (existingStatus.includes('(Hub required for auto-discovery)')) {
                             statusContent += ' <span style="color: red;">(Hub required for auto-discovery)</span>';
                         }
                     }
                }
            } else if (attemptedToBecomeHub && !isHub) {
                 statusContent += ' <span style="color: red;">(Failed to start as Hub; ID likely taken)</span>';
            }
        } else {
            statusContent = 'Initializing Peer...';
        }

        const connectedPeerIds = Object.keys(connections);
        if (connectedPeerIds.length > 0) {
            statusContent += ` | Connected to: ${connectedPeerIds.join(', ')}`;
        }
        status.innerHTML = statusContent;

        // Re-attach copy listener (since innerHTML removes previous ones)
        const copyBtn = document.getElementById('copy-id');
        if (copyBtn) {
            // Use closure to capture the correct peer.id at the time of attachment
            const currentPeerId = peer.id;
            copyBtn.addEventListener('click', () => copyPeerId(currentPeerId));
        }


        // --- Update Peer List Section ---
        peerList.innerHTML = ''; // Clear current list
        if (!connectedPeerIds.length) {
            peerList.innerHTML = '<li>No active data connections.</li>';
            // Provide guidance based on state
            if (isHub) {
                 peerList.innerHTML += '<li style="color: blue;">Waiting for clients to connect to the Hub...</li>';
            } else if (discoveryHubConnection?.open) {
                 peerList.innerHTML += '<li style="color: green;">Waiting for peers via Hub...</li>';
            } else if (attemptedToBecomeHub && !isHub) {
                 peerList.innerHTML += '<li style="color: red;">Cannot auto-discover (Hub ID taken). Use manual connection or refresh.</li>';
            } else if (!discoveryHubConnection) {
                 peerList.innerHTML += '<li style="color: grey;">Waiting for Hub or manual connection...</li>';
            }
            return;
        }

        connectedPeerIds.forEach(pid => {
            const li = document.createElement('li');
            li.textContent = pid;
            const disconnectBtn = document.createElement('button');
            disconnectBtn.textContent = 'Disconnect';
            disconnectBtn.style.marginLeft = '10px';
            disconnectBtn.onclick = () => {
                if (connections[pid]) {
                    console.log(`Manually disconnecting from ${pid}`);
                    connections[pid].close(); // Triggers 'close' event handled in setupConnection
                }
            };
            li.appendChild(disconnectBtn);
            peerList.appendChild(li);
        });
    }

    // --- File Selection ---
    fileInput.addEventListener('change', e => {
        selectedFiles = Array.from(e.target.files);
        fileList.innerHTML = ''; // Clear previous file list
        sendProgressList.innerHTML = ''; // Clear previous send progress
        if (selectedFiles.length === 0) {
             fileList.innerHTML = '<li>No files selected.</li>';
             return;
        }
        selectedFiles.forEach(f => {
            const li = document.createElement('li');
            li.textContent = `${f.name} (${formatBytes(f.size)})`;
            fileList.appendChild(li);
        });
        // Reset file input value to allow selecting the same file again if needed
        e.target.value = null;
    });

    // --- Send Files with Progress ---
    sendButton.addEventListener('click', () => {
        if (!selectedFiles.length) return alert('No files selected.');
        const peersToSendTo = Object.values(connections); // Get active DATA connections
        if (!peersToSendTo.length) return alert('No peers connected for sending files.');

        sendProgressList.innerHTML = ''; // Clear previous send progress UI

        selectedFiles.forEach(file => {
            peersToSendTo.forEach(conn => {
                // Double-check connection is open and valid before starting send
                if (!conn || !conn.open || !connections[conn.peer]) {
                    console.warn(`Skipping send to ${conn.peer}, connection not open or invalid.`);
                    const failedLi = document.createElement('li');
                    failedLi.textContent = `Sending ${file.name} to ${conn.peer}: Failed (Connection Closed)`;
                    failedLi.style.color = 'red';
                    sendProgressList.appendChild(failedLi);
                    return; // Skip to next peer
                }

                // Create a unique ID for the progress element, sanitizing file name
                const safeFileName = file.name.replace(/[^a-zA-Z0-9_-]/g, '-'); // Basic sanitization
                const progressId = `send-${conn.peer}-${safeFileName}`;

                // Create progress UI element
                const li = document.createElement('li');
                li.id = progressId;
                const label = document.createTextNode(`Sending ${file.name} to ${conn.peer}: `);
                const progress = document.createElement('progress');
                progress.max = file.size;
                progress.value = 0;
                li.append(label, progress);
                sendProgressList.appendChild(li);

                // Start the chunked sending process
                sendFileChunked(file, conn, progress, li);
            });
        });

        // Clear file selection after initiating sends
        selectedFiles = [];
        fileList.innerHTML = '<li>No files selected.</li>';
    });

    // Helper function to send a file in chunks
    function sendFileChunked(file, conn, progressBar, progressElement) {
        const chunkSize = 64 * 1024; // 64KB
        let offset = 0;
        const peerId = conn.peer; // Capture peerId in case conn object becomes invalid later

        function readSlice() {
            // Check connection status before reading/sending each chunk
            // Use the captured peerId to look up the current connection status
            if (!connections[peerId] || !connections[peerId].open) {
                console.warn(`Connection to ${peerId} lost during send of ${file.name}. Aborting send.`);
                progressElement.textContent = `Sending ${file.name} to ${peerId}: Failed (Disconnected)`;
                progressElement.style.color = 'red';
                // Remove progress bar if it exists
                progressBar?.remove();
                return; // Stop sending to this peer
            }

            const slice = file.slice(offset, offset + chunkSize);
            const reader = new FileReader();

            reader.onload = evt => {
                // Double-check connection right before sending data
                if (!connections[peerId] || !connections[peerId].open) {
                   console.warn(`Connection to ${peerId} lost just before sending chunk for ${file.name}. Aborting send.`);
                   progressElement.textContent = `Sending ${file.name} to ${peerId}: Failed (Disconnected)`;
                   progressElement.style.color = 'red';
                   progressBar?.remove();
                   return;
                }
                try {
                    const isLastChunk = offset + slice.size >= file.size;
                    const chunkData = {
                        type: 'file-chunk',
                        fileName: file.name,
                        chunk: evt.target.result, // ArrayBuffer
                        isLast: isLastChunk,
                        // Send total size only with the first chunk for efficiency
                        ...(offset === 0 && { totalSize: file.size })
                    };

                    // Send the chunk data
                    conn.send(chunkData);

                    offset += slice.size; // Use actual slice size read
                    if (progressBar) progressBar.value = offset; // Update progress bar

                    if (offset < file.size) {
                        // Use setTimeout to yield to the event loop, preventing UI freezes
                        setTimeout(readSlice, 0);
                    } else {
                        // Finished sending all chunks
                        console.log(`Finished sending ${file.name} to ${peerId}`);
                        progressElement.textContent = `Sent ${file.name} to ${peerId} (${formatBytes(file.size)})`;
                        progressElement.style.color = 'green'; // Indicate success
                        progressBar?.remove(); // Remove progress bar on completion
                    }
                } catch (error) {
                    console.error(`Error sending chunk for ${file.name} to ${peerId}:`, error);
                    progressElement.textContent = `Sending ${file.name} to ${peerId}: Error`;
                    progressElement.style.color = 'red';
                    progressBar?.remove();
                    // Consider closing the connection on send error
                    if (connections[peerId]) connections[peerId].close();
                }
            };

            reader.onerror = (err) => {
                console.error(`FileReader error for ${file.name}:`, err);
                alert(`Error reading file ${file.name}. Cannot send.`);
                progressElement.textContent = `Sending ${file.name} to ${peerId}: Read Error`;
                progressElement.style.color = 'red';
                progressBar?.remove();
            };

            reader.readAsArrayBuffer(slice);
        }
        readSlice(); // Start the sending process by reading the first slice
    }


    // --- Receive & Reassemble File Chunks ---
    function handleData(data, conn) {
        // Check if it's our specific file chunk type
        if (data.type === 'file-chunk' && data.fileName && data.chunk) {
            const key = `${conn.peer}:${data.fileName}`;
            // Sanitize key for use as a DOM ID
            const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '-');

            // --- First Chunk Handling: Initialize transfer state and UI ---
            if (data.totalSize !== undefined && !incomingTransfers[key]) {
                // Create progress UI element
                const li = document.createElement('li');
                li.id = `receive-${sanitizedKey}`;
                const label = document.createTextNode(`Receiving ${data.fileName} from ${conn.peer}: `);
                const progress = document.createElement('progress');
                progress.max = data.totalSize;
                progress.value = 0;
                li.append(label, progress);
                receivedFiles.appendChild(li); // Add to the received files list

                // Initialize transfer state in memory
                incomingTransfers[key] = {
                    buffer: [],
                    receivedBytes: 0,
                    totalSize: data.totalSize,
                    progressElement: li // Store reference to the UI element
                };
                console.log(`Started receiving ${data.fileName} (${formatBytes(data.totalSize)}) from ${conn.peer}`);
            }

            // --- Subsequent Chunk Handling ---
            const transfer = incomingTransfers[key];
            if (transfer) {
                // Ensure chunk is ArrayBuffer (handle potential browser inconsistencies)
                const chunkBuffer = data.chunk instanceof ArrayBuffer ? data.chunk : new Uint8Array(data.chunk).buffer;

                transfer.buffer.push(chunkBuffer);
                transfer.receivedBytes += chunkBuffer.byteLength;

                // Update progress bar UI
                const progressBar = transfer.progressElement.querySelector('progress');
                if (progressBar) {
                    progressBar.value = transfer.receivedBytes;
                } else {
                     // This might happen if the element was modified (e.g., on error)
                     console.warn("Progress bar not found for active transfer:", key);
                }

                // --- Last Chunk / Completion Check ---
                if (data.isLast) {
                    if (transfer.receivedBytes === transfer.totalSize) {
                        // Successfully received all bytes
                        // Attempt to get file type from the original file object if possible (might not be sent)
                        const fileType = selectedFiles.find(f => f.name === data.fileName)?.type || 'application/octet-stream'; // Default type
                        const blob = new Blob(transfer.buffer, { type: fileType });
                        const url = URL.createObjectURL(blob);

                        // Replace progress bar with a download link
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = data.fileName; // Set download attribute
                        a.textContent = `${data.fileName} (${formatBytes(transfer.totalSize)})`;
                        transfer.progressElement.innerHTML = ''; // Clear progress bar and label
                        transfer.progressElement.append(a, document.createTextNode(` (from ${conn.peer})`));
                        transfer.progressElement.style.color = 'green'; // Indicate success

                        console.log(`Finished receiving ${data.fileName} from ${conn.peer}`);
                    } else {
                        // Error: Received 'last chunk' flag but byte count doesn't match
                        console.error(`File transfer incomplete for ${data.fileName} from ${conn.peer}. Expected ${transfer.totalSize} bytes, received ${transfer.receivedBytes}`);
                        transfer.progressElement.textContent = `Error receiving ${data.fileName} from ${conn.peer} (Incomplete)`;
                        transfer.progressElement.style.color = 'red';
                    }
                    // Clean up transfer state from memory regardless of success/failure
                    delete incomingTransfers[key];
                }
            } else if (data.totalSize === undefined) {
                // Received a chunk before the initial metadata chunk (with totalSize)
                // This might happen with packet loss/reordering on unreliable connections,
                // or if the sender had an error.
                console.warn(`Received chunk for ${data.fileName} from ${conn.peer} without prior metadata (totalSize). Discarding chunk.`);
                // Attempt to find and mark any existing UI element for this transfer as errored
                 const existingLi = document.getElementById(`receive-${sanitizedKey}`);
                 if (existingLi && !existingLi.querySelector('a')) { // If it's still showing progress
                     existingLi.textContent = `Error receiving ${data.fileName} from ${conn.peer} (Missing Metadata)`;
                     existingLi.style.color = 'red';
                     // Optionally remove it after a delay or leave it as an error indicator
                     // setTimeout(() => existingLi.remove(), 10000);
                 }
                 // Cannot proceed with this transfer, discard chunk.
            }
        } else {
            // Handle other data types if needed in the future
            console.log(`Received non-file-chunk data from ${conn.peer}:`, data);
        }
    }

    // --- Cleanup for Incomplete Transfers on Disconnect/Error ---
    function cleanupIncompleteTransfers(peerId) {
        // --- Incoming transfers from the disconnected peer ---
        for (const key in incomingTransfers) {
            if (key.startsWith(peerId + ':')) {
                const transfer = incomingTransfers[key];
                // Check if the transfer was actually in progress (has progressElement and no download link yet)
                if (transfer.progressElement && !transfer.progressElement.querySelector('a')) {
                    transfer.progressElement.textContent = `Failed receiving ${key.split(':')[1]} from ${peerId} (Disconnected)`;
                    transfer.progressElement.style.color = 'red';
                    // Optionally remove the element after a delay
                    // setTimeout(() => transfer.progressElement.remove(), 5000);
                }
                delete incomingTransfers[key]; // Remove from memory
                console.log(`Cleaned up incomplete incoming transfer ${key}`);
            }
        }
         // --- Outgoing transfers *to* the disconnected peer (update UI only) ---
        const sendingItems = sendProgressList.querySelectorAll('li');
        sendingItems.forEach(item => {
            // ID format is assumed: send-<peerId>-<sanitizedFileName>
            const parts = item.id.split('-');
            // Check if the ID structure matches and the peerId matches the disconnected one
            if (parts.length >= 3 && parts[0] === 'send' && parts[1] === peerId) {
                 // Check if it's still showing a progress bar (i.e., not completed/failed yet)
                 if (item.querySelector('progress')) {
                     item.textContent += " - Failed (Disconnected)";
                     item.style.color = 'red';
                     item.querySelector('progress').remove(); // Remove the progress bar itself
                 }
            }
        });
    }

    // --- Utility Function: Format Bytes ---
    function formatBytes(bytes, decimals = 2) {
        // Handle edge cases and non-numeric input
        if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        // Calculate the appropriate size index
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        // Format the number and append the size unit
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

}); // End DOMContentLoaded