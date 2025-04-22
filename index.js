// index.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    // DISCOVERY_ID removed

    // --- Globals & DOM References ---
    const peer = new Peer(); // Always let PeerJS generate the ID
    const connections = {}; // { peerId: DataConnection } - For DATA connections
    const fileInput = document.getElementById('file-input');
    const sendButton = document.getElementById('send-button');
    const fileList = document.getElementById('file-list');
    const status = document.getElementById('status');
    const peerList = document.getElementById('peer-list');
    const receivedFiles = document.getElementById('received-files'); // Holds progress bars too
    const qrCodeCanvas = document.getElementById('peer-id-qr-code'); // Get canvas for QR code
    const qrCodeContainer = document.getElementById('qr-code-container'); // Get container

    let selectedFiles = [];
    const sendProgressList = document.createElement('ul');
    sendProgressList.id = 'send-progress-list';
    fileList.parentNode.insertBefore(sendProgressList, fileList.nextSibling);

    // Buffer and progress tracking for incoming files
    // Structure: { "peerId:fileName": { buffer: [...], receivedBytes: 0, totalSize: 0, progressElement: Element } }
    const incomingTransfers = {};

    // --- Peer Setup ---
    peer.on('open', id => {
        console.log(`PeerJS initialized. Your ID: ${id}`);
        status.innerHTML = `Your ID: <code>${id}</code> <button id="copy-id">Copy ID</button>`;
        document.getElementById('copy-id')?.addEventListener('click', () => copyPeerId(id));
        displayQrCode(id);
        updatePeerList();
    });

    peer.on('error', err => {
        console.error("PeerJS error:", err);
        let alertMsg = `An error occurred with PeerJS: ${err.type}`;

        // Simplified error handling without hub specifics
        if (err.type === 'peer-unavailable') {
            const attemptedPeer = err.message.match(/Could not connect to peer (.*?)$/);
            alertMsg = `Could not connect to peer ${attemptedPeer ? attemptedPeer[1] : ''}. Peer ID might be incorrect or the peer is offline.`;
        } else if (err.type === 'network') {
            alertMsg = `Network error. Please check your connection.`;
        } else if (err.type === 'unavailable-id') {
            alertMsg = `The generated Peer ID (${peer.id}) is already taken. Please refresh the page to get a new ID.`;
        } else if (err.type === 'disconnected') {
            alertMsg = `Disconnected from the PeerJS signaling server. Please refresh.`;
        } else if (err.type === 'server-error') {
            alertMsg = `Error connecting to the PeerJS signaling server.`;
        }

        if (alertMsg) alert(alertMsg);

        // Reset manual connection UI elements
        const connectInput = document.getElementById('peer-id-input');
        const connectButton = document.getElementById('connect-button');
        if (connectInput) connectInput.value = '';
        if (connectButton && connectButton.textContent === 'Connecting...') {
            connectButton.disabled = false;
            connectButton.textContent = 'Connect';
        }
        updatePeerList();
    });


    peer.on('connection', conn => {
        console.log(`Incoming connection from ${conn.peer} with metadata:`, conn.metadata);
        console.log(`Accepting data connection from peer ${conn.peer}`);
        setupConnection(conn);
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

        console.log(`Attempting to connect manually to ${remoteId}...`);
        connectButton.disabled = true;
        connectButton.textContent = 'Connecting...';

        const conn = peer.connect(remoteId, { reliable: true });

        conn.on('error', (err) => {
            console.error(`Manual connection error with ${remoteId}:`, err);
            alert(`Failed to connect to ${remoteId}. Error: ${err.type}`);
            if (connectInput.value === remoteId || connectButton.textContent === 'Connecting...') {
                 connectButton.disabled = false;
                 connectButton.textContent = 'Connect';
            }
        });
        setupConnection(conn);
    });

    // --- Connection Handler (for DATA connections ONLY) ---
    function setupConnection(conn) {
        const remotePeerId = conn.peer;

        if (connections[remotePeerId]) {
            console.log(`Already have an active data connection to ${remotePeerId}. Ignoring duplicate setup request.`);
            if (connections[remotePeerId] !== conn) {
                 conn.close();
            }
            return;
        }

        console.log(`Setting up data connection with ${remotePeerId}`);
        connections[remotePeerId] = conn;
        updatePeerList();

        conn.on('open', () => {
            console.log(`Data connection established with ${remotePeerId}`);
            const connectButton = document.getElementById('connect-button');
            const connectInput = document.getElementById('peer-id-input');
            if (connectButton && connectInput.value === remotePeerId) {
                 connectButton.disabled = false;
                 connectButton.textContent = 'Connect';
                 connectInput.value = '';
            }
        });

        conn.on('data', data => handleData(data, conn));

        conn.on('close', () => {
            console.log(`Data connection closed with ${remotePeerId}`);
            if (connections[remotePeerId]) {
                delete connections[remotePeerId];
                updatePeerList();
                cleanupIncompleteTransfers(remotePeerId);
            }
        });

        conn.on('error', (err) => {
             console.error(`Error on data connection with ${remotePeerId}:`, err);
             if (connections[remotePeerId]) {
                 delete connections[remotePeerId];
                 updatePeerList();
                 cleanupIncompleteTransfers(remotePeerId);
             }
        });
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

    function displayQrCode(id) {
        if (!id || !qrCodeCanvas || !qrCodeContainer) {
            console.warn("Cannot display QR code: Missing ID or canvas/container element.");
            if (qrCodeContainer) qrCodeContainer.style.display = 'none';
            return;
        }
        if (typeof QRCode === 'undefined') {
            console.error("QRCode library is not loaded. Cannot generate QR code.");
            qrCodeContainer.innerHTML = '<p style="color: red;">Error: QR Code library not loaded.</p>';
            qrCodeContainer.style.display = 'block';
            return;
        }

        QRCode.toCanvas(qrCodeCanvas, id, { width: 160, margin: 1 }, (error) => {
            if (error) {
                console.error("QR Code generation failed:", error);
                qrCodeContainer.innerHTML = '<p style="color: red;">Error generating QR code.</p>';
            } else {
                console.log('QR Code generated successfully.');
                qrCodeContainer.style.display = 'block';
            }
        });
    }

    function updatePeerList() {
        let statusContent = '';
        if (peer.id) {
            statusContent = `Your ID: <code>${peer.id}</code> <button id="copy-id">Copy ID</button>`;
        } else {
            statusContent = 'Initializing Peer...';
        }

        const connectedPeerIds = Object.keys(connections);
        if (connectedPeerIds.length > 0) {
            statusContent += ` | Connected to: ${connectedPeerIds.join(', ')}`;
        }
        status.innerHTML = statusContent;

        const copyBtn = document.getElementById('copy-id');
        if (copyBtn) {
            const currentPeerId = peer.id;
            copyBtn.addEventListener('click', () => copyPeerId(currentPeerId));
        }

        peerList.innerHTML = '';
        if (!connectedPeerIds.length) {
            peerList.innerHTML = '<li>No active data connections.</li>';
            peerList.innerHTML += '<li style="color: grey;">Share your QR code or ID, or connect manually.</li>';
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
                    connections[pid].close();
                }
            };
            li.appendChild(disconnectBtn);
            peerList.appendChild(li);
        });
    }

    // --- File Selection ---
    fileInput.addEventListener('change', e => {
        selectedFiles = Array.from(e.target.files);
        fileList.innerHTML = '';
        sendProgressList.innerHTML = '';
        if (selectedFiles.length === 0) {
             fileList.innerHTML = '<li>No files selected.</li>';
             return;
        }
        selectedFiles.forEach(f => {
            const li = document.createElement('li');
            li.textContent = `${f.name} (${formatBytes(f.size)})`;
            fileList.appendChild(li);
        });
        e.target.value = null;
    });

    // --- Send Files with Progress ---
    sendButton.addEventListener('click', () => {
        if (!selectedFiles.length) return alert('No files selected.');
        const peersToSendTo = Object.values(connections);
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
                li.append(label, progress); // Append progress bar initially
                sendProgressList.appendChild(li);

                // --- Step 1: Send Metadata First ---
                const metadata = {
                    type: 'file-metadata',
                    fileName: file.name,
                    totalSize: file.size
                };
                console.log(`Sending metadata for ${file.name} to ${conn.peer}`);
                try {
                    conn.send(metadata);

                    // --- Step 2: Start sending chunks AFTER sending metadata ---
                    // Note: We don't explicitly wait for an ACK here, relying on the reliable channel
                    // to deliver metadata before (or close enough to) the first chunk.
                    sendFileChunked(file, conn, progress, li);

                } catch (error) {
                     console.error(`Error sending metadata for ${file.name} to ${conn.peer}:`, error);
                     li.textContent = `Sending ${file.name} to ${conn.peer}: Metadata Send Error`;
                     li.style.color = 'red';
                     progress?.remove(); // Remove progress bar on metadata error
                     // Optionally close connection
                     // if (connections[conn.peer]) connections[conn.peer].close();
                }
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
            if (!connections[peerId] || !connections[peerId].open) {
                console.warn(`Connection to ${peerId} lost during send of ${file.name}. Aborting send.`);
                progressElement.textContent = `Sending ${file.name} to ${peerId}: Failed (Disconnected)`;
                progressElement.style.color = 'red';
                progressBar?.remove();
                return;
            }

            const slice = file.slice(offset, offset + chunkSize);
            const reader = new FileReader();

            reader.onload = evt => {
                if (!connections[peerId] || !connections[peerId].open) {
                   console.warn(`Connection to ${peerId} lost just before sending chunk for ${file.name}. Aborting send.`);
                   progressElement.textContent = `Sending ${file.name} to ${peerId}: Failed (Disconnected)`;
                   progressElement.style.color = 'red';
                   progressBar?.remove();
                   return;
                }
                try {
                    const isLastChunk = offset + slice.size >= file.size;
                    // --- Metadata Change: Remove totalSize from chunk data ---
                    const chunkData = {
                        type: 'file-chunk',
                        fileName: file.name, // Still useful for matching chunks to transfers
                        chunk: evt.target.result, // ArrayBuffer
                        isLast: isLastChunk
                        // totalSize is removed here
                    };

                    conn.send(chunkData);

                    offset += slice.size;
                    if (progressBar) progressBar.value = offset;

                    if (offset < file.size) {
                        setTimeout(readSlice, 0);
                    } else {
                        console.log(`Finished sending ${file.name} to ${peerId}`);
                        progressElement.textContent = `Sent ${file.name} to ${peerId} (${formatBytes(file.size)})`;
                        progressElement.style.color = 'green';
                        progressBar?.remove();
                    }
                } catch (error) {
                    console.error(`Error sending chunk for ${file.name} to ${peerId}:`, error);
                    progressElement.textContent = `Sending ${file.name} to ${peerId}: Error`;
                    progressElement.style.color = 'red';
                    progressBar?.remove();
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
        readSlice(); // Start the sending process
    }


    // --- Receive & Reassemble File Chunks ---
    function handleData(data, conn) {
        const key = `${conn.peer}:${data.fileName}`;
        // Sanitize key for use as a DOM ID
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '-');

        // --- Handle Metadata Message ---
        if (data.type === 'file-metadata' && data.fileName && data.totalSize !== undefined) {
            console.log(`Received metadata for ${data.fileName} (${formatBytes(data.totalSize)}) from ${conn.peer}`);

            // Check if transfer already exists (e.g., duplicate metadata message)
            if (incomingTransfers[key]) {
                console.warn(`Received duplicate metadata for ongoing transfer: ${key}. Ignoring.`);
                return;
            }
             // Check if a previous transfer failed and element still exists
             const existingLi = document.getElementById(`receive-${sanitizedKey}`);
             if (existingLi) {
                 console.warn(`UI element for ${key} already exists. Removing old element before starting new transfer.`);
                 existingLi.remove();
             }


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

        // --- Handle File Chunk Message ---
        } else if (data.type === 'file-chunk' && data.fileName && data.chunk) {
            const transfer = incomingTransfers[key];

            // Check if metadata was received first
            if (!transfer) {
                console.error(`Received file chunk for ${data.fileName} from ${conn.peer} before metadata. Discarding chunk. Ensure reliable connection.`);
                // Optionally, try to find/update a UI element if one exists from a previous failed attempt
                 const existingLi = document.getElementById(`receive-${sanitizedKey}`);
                 if (existingLi && !existingLi.querySelector('a')) { // If it's still showing progress/error
                     existingLi.textContent = `Error receiving ${data.fileName} from ${conn.peer} (Missing Metadata)`;
                     existingLi.style.color = 'red';
                 }
                return; // Cannot process chunk without knowing total size etc.
            }

            // Ensure chunk is ArrayBuffer
            const chunkBuffer = data.chunk instanceof ArrayBuffer ? data.chunk : new Uint8Array(data.chunk).buffer;

            transfer.buffer.push(chunkBuffer);
            transfer.receivedBytes += chunkBuffer.byteLength;

            // Update progress bar UI
            const progressBar = transfer.progressElement.querySelector('progress');
            if (progressBar) {
                progressBar.value = transfer.receivedBytes;
            } else {
                 console.warn("Progress bar not found for active transfer:", key);
            }

            // --- Last Chunk / Completion Check ---
            if (data.isLast) {
                if (transfer.receivedBytes === transfer.totalSize) {
                    // Successfully received all bytes
                    // Attempt to get file type (MIME type) - Note: This info isn't sent currently.
                    // We could add 'fileType: file.type' to the metadata message if needed.
                    const fileType = 'application/octet-stream'; // Default type
                    const blob = new Blob(transfer.buffer, { type: fileType });
                    const url = URL.createObjectURL(blob);

                    // Replace progress bar with a download link
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = data.fileName;
                    a.textContent = `${data.fileName} (${formatBytes(transfer.totalSize)})`;
                    transfer.progressElement.innerHTML = '';
                    transfer.progressElement.append(a, document.createTextNode(` (from ${conn.peer})`));
                    transfer.progressElement.style.color = 'green';

                    console.log(`Finished receiving ${data.fileName} from ${conn.peer}`);
                } else {
                    // Error: Received 'last chunk' flag but byte count doesn't match
                    console.error(`File transfer incomplete for ${data.fileName} from ${conn.peer}. Expected ${transfer.totalSize} bytes, received ${transfer.receivedBytes}`);
                    transfer.progressElement.textContent = `Error receiving ${data.fileName} from ${conn.peer} (Incomplete)`;
                    transfer.progressElement.style.color = 'red';
                }
                // Clean up transfer state from memory
                delete incomingTransfers[key];
            }
        } else {
            // Handle other data types if needed
            console.log(`Received unknown data type from ${conn.peer}:`, data);
        }
    }

    // --- Cleanup for Incomplete Transfers on Disconnect/Error ---
    function cleanupIncompleteTransfers(peerId) {
        // Incoming transfers
        for (const key in incomingTransfers) {
            if (key.startsWith(peerId + ':')) {
                const transfer = incomingTransfers[key];
                if (transfer.progressElement && !transfer.progressElement.querySelector('a')) {
                    transfer.progressElement.textContent = `Failed receiving ${key.split(':')[1]} from ${peerId} (Disconnected)`;
                    transfer.progressElement.style.color = 'red';
                }
                delete incomingTransfers[key];
                console.log(`Cleaned up incomplete incoming transfer ${key}`);
            }
        }
         // Outgoing transfers (UI update)
        const sendingItems = sendProgressList.querySelectorAll('li');
        sendingItems.forEach(item => {
            const parts = item.id.split('-');
            if (parts.length >= 3 && parts[0] === 'send' && parts[1] === peerId) {
                 if (item.querySelector('progress')) {
                     item.textContent += " - Failed (Disconnected)";
                     item.style.color = 'red';
                     item.querySelector('progress').remove();
                 }
            }
        });
    }

    // --- Utility Function: Format Bytes ---
    function formatBytes(bytes, decimals = 2) {
        if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

}); // End DOMContentLoaded