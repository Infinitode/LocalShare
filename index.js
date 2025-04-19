// // index.js

// document.addEventListener('DOMContentLoaded', () => {
//     // --- Globals & DOM References ---
//     const peer = new Peer();
//     const connections = {}; // { peerId: DataConnection }
//     const fileInput = document.getElementById('file-input');
//     const sendButton = document.getElementById('send-button');
//     const fileList = document.getElementById('file-list');
//     const status = document.getElementById('status');
//     const peerList = document.getElementById('peer-list');
//     const receivedFiles = document.getElementById('received-files'); // This will now hold progress bars too

//     let selectedFiles = [];
//     const sendProgressList = document.createElement('ul');
//     sendProgressList.id = 'send-progress-list';
//     fileList.parentNode.insertBefore(sendProgressList, fileList.nextSibling);

//     // Buffer and progress tracking for incoming files
//     // Structure: { "peerId:fileName": { buffer: [ArrayBuffer,...], receivedBytes: 0, totalSize: 0, progressElement: Element } }
//     const incomingTransfers = {};

//     // --- Peer Setup ---
//     peer.on('open', id => {
//         status.innerHTML = `Your ID: <code>${id}</code> <button id="copy-id">Copy ID</button>`;
//         document.getElementById('copy-id').addEventListener('click', () => {
//             navigator.clipboard.writeText(id).then(() => {
//                 // Provide visual feedback without replacing the ID
//                 const copyButton = document.getElementById('copy-id');
//                 const originalText = copyButton.textContent;
//                 copyButton.textContent = 'Copied! 👍';
//                 setTimeout(() => { copyButton.textContent = originalText; }, 1500);
//             }, (err) => {
//                 console.error('Failed to copy ID: ', err);
//                 alert('Failed to copy ID.');
//             });
//         });
//     });

//     peer.on('error', err => {
//         console.error("PeerJS error:", err);
//         // Display more specific errors if possible
//         if (err.type === 'peer-unavailable') {
//             alert(`Could not connect to peer. Peer ID might be incorrect or the peer is offline.`);
//         } else if (err.type === 'network') {
//              alert(`Network error. Please check your connection.`);
//         } else {
//             alert(`An error occurred with PeerJS: ${err.type}`);
//         }
//          // Reset connection UI if trying to connect
//         const connectInput = document.getElementById('peer-id-input');
//         const connectButton = document.getElementById('connect-button');
//         if (connectInput) connectInput.value = '';
//         if (connectButton) connectButton.disabled = false;
//     });


//     peer.on('connection', conn => setupConnection(conn));

//     // --- Dial-in UI ---
//     const connectInput = document.createElement('input');
//     const connectButton = document.createElement('button');
//     connectInput.id = 'peer-id-input';
//     connectInput.placeholder = 'Enter peer ID…';
//     connectInput.style.marginRight = '8px';
//     connectButton.id = 'connect-button';
//     connectButton.textContent = 'Connect';
//     document.getElementById('connection-section').append(connectInput, connectButton);

//     connectButton.addEventListener('click', () => {
//         const remoteId = connectInput.value.trim();
//         if (!remoteId) return alert('Please enter a peer ID.');
//         if (connections[remoteId]) return alert('Already connected to ' + remoteId);
//         if (remoteId === peer.id) return alert("You cannot connect to yourself.");

//         console.log(`Attempting to connect to ${remoteId}...`);
//         // Disable button while attempting connection
//         connectButton.disabled = true;
//         connectButton.textContent = 'Connecting...';

//         const conn = peer.connect(remoteId, { reliable: true });

//         // Handle connection errors specifically for this attempt
//         conn.on('error', (err) => {
//             console.error(`Connection error with ${remoteId}:`, err);
//             alert(`Failed to connect to ${remoteId}. Error: ${err.type}`);
//             connectButton.disabled = false; // Re-enable button
//             connectButton.textContent = 'Connect';
//         });

//         // If connection opens, setupConnection will handle the rest
//         // If it fails to open after a timeout, PeerJS might trigger a peer-unavailable error on the main peer object
//         setupConnection(conn);
//     });

//     // --- Connection Handler ---
//     function setupConnection(conn) {
//         conn.on('open', () => {
//             console.log(`Connection opened with ${conn.peer}`);
//             connections[conn.peer] = conn;
//             updatePeerList();
//             conn.on('data', data => handleData(data, conn));

//             // Reset connection button state if it was the one initiating
//             const connectButton = document.getElementById('connect-button');
//             const connectInput = document.getElementById('peer-id-input');
//             if (connectButton && connectInput.value === conn.peer) {
//                  connectButton.disabled = false;
//                  connectButton.textContent = 'Connect';
//                  connectInput.value = ''; // Clear input after successful connection
//             }
//         });

//         conn.on('close', () => {
//             console.log(`Connection closed with ${conn.peer}`);
//             delete connections[conn.peer];
//             updatePeerList();
//             // Clean up any incomplete transfers from this peer
//             cleanupIncompleteTransfers(conn.peer);
//         });

//         // Add error handling for the specific connection
//         conn.on('error', (err) => {
//              console.error(`Error on connection with ${conn.peer}:`, err);
//              // Optionally alert the user or just log it
//              // alert(`Connection error with ${conn.peer}: ${err.type}`);
//              // Ensure cleanup happens even on error-driven close
//              if (connections[conn.peer]) {
//                  delete connections[conn.peer];
//                  updatePeerList();
//                  cleanupIncompleteTransfers(conn.peer);
//              }
//         });
//     }

//     function updatePeerList() {
//         peerList.innerHTML = '';
//         const peers = Object.keys(connections);
//         if (!peers.length) {
//             // Keep the ID visible even when not connected
//             if (peer.id) {
//                  status.innerHTML = `Your ID: <code>${peer.id}</code> <button id="copy-id">Copy ID</button>`;
//                  // Re-attach listener as innerHTML wipes it
//                  document.getElementById('copy-id')?.addEventListener('click', () => {
//                      navigator.clipboard.writeText(peer.id).then(() => {
//                          const copyButton = document.getElementById('copy-id');
//                          const originalText = copyButton.textContent;
//                          copyButton.textContent = 'Copied! 👍';
//                          setTimeout(() => { copyButton.textContent = originalText; }, 1500);
//                      });
//                  });
//             } else {
//                  status.textContent = 'Initializing Peer...'; // Or similar state
//             }
//             return;
//         }
//         // Keep ID visible when connected too
//         status.innerHTML = `Your ID: <code>${peer.id}</code> <button id="copy-id">Copy ID</button> | Connected to: ${peers.join(', ')}`;
//          document.getElementById('copy-id')?.addEventListener('click', () => {
//              navigator.clipboard.writeText(peer.id).then(() => {
//                  const copyButton = document.getElementById('copy-id');
//                  const originalText = copyButton.textContent;
//                  copyButton.textContent = 'Copied! 👍';
//                  setTimeout(() => { copyButton.textContent = originalText; }, 1500);
//              });
//          });

//         peers.forEach(pid => {
//             const li = document.createElement('li');
//             li.textContent = pid;
//             // Add a disconnect button
//             const disconnectBtn = document.createElement('button');
//             disconnectBtn.textContent = 'Disconnect';
//             disconnectBtn.style.marginLeft = '10px';
//             disconnectBtn.onclick = () => {
//                 if (connections[pid]) {
//                     connections[pid].close(); // This will trigger the 'close' event
//                 }
//             };
//             li.appendChild(disconnectBtn);
//             peerList.appendChild(li);
//         });
//     }

//     // --- File Selection ---
//     fileInput.addEventListener('change', e => {
//         selectedFiles = Array.from(e.target.files);
//         fileList.innerHTML = '';
//         sendProgressList.innerHTML = ''; // Clear previous send progress
//         selectedFiles.forEach(f => {
//             const li = document.createElement('li');
//             li.textContent = `${f.name} (${formatBytes(f.size)})`;
//             fileList.appendChild(li);
//         });
//         // Reset file input value to allow selecting the same file again
//         e.target.value = null;
//     });

//     // --- Send Files with Progress ---
//     sendButton.addEventListener('click', () => {
//         if (!selectedFiles.length) return alert('No files selected.');
//         const peers = Object.values(connections);
//         if (!peers.length) return alert('No peers connected.');

//         // Clear previous send progress UI before starting new sends
//         sendProgressList.innerHTML = '';

//         selectedFiles.forEach(file => {
//             // Send to each connected peer
//             peers.forEach(conn => {
//                 // UI: create progress element for *this specific send operation*
//                 const progressId = `send-${conn.peer}-${file.name}`;
//                 let li = document.getElementById(progressId);
//                 if (!li) { // Create if it doesn't exist for this file-peer combo
//                     li = document.createElement('li');
//                     li.id = progressId;
//                     const label = document.createTextNode(`Sending ${file.name} to ${conn.peer}: `);
//                     const progress = document.createElement('progress');
//                     progress.max = file.size;
//                     progress.value = 0;
//                     li.append(label, progress);
//                     sendProgressList.appendChild(li);
//                 }
//                 const progressBar = li.querySelector('progress');

//                 // Send in 64KB chunks
//                 const chunkSize = 64 * 1024; // 64KB
//                 let offset = 0;

//                 function readSlice() {
//                     if (!connections[conn.peer]) {
//                         console.warn(`Connection to ${conn.peer} lost during send.`);
//                         // Optionally update UI to show failure for this peer
//                         li.textContent = `Sending ${file.name} to ${conn.peer}: Failed (Disconnected)`;
//                         return; // Stop sending to this peer
//                     }

//                     const slice = file.slice(offset, offset + chunkSize);
//                     const reader = new FileReader();

//                     reader.onload = evt => {
//                         if (!connections[conn.peer]) { // Check again before sending
//                            console.warn(`Connection to ${conn.peer} lost just before sending chunk.`);
//                            li.textContent = `Sending ${file.name} to ${conn.peer}: Failed (Disconnected)`;
//                            return;
//                         }
//                         try {
//                             const isLastChunk = offset + slice.size >= file.size;
//                             const chunkData = {
//                                 type: 'file-chunk', // Add a type for better handling
//                                 fileName: file.name,
//                                 chunk: evt.target.result,
//                                 isLast: isLastChunk,
//                                 // Send total size only with the first chunk
//                                 ...(offset === 0 && { totalSize: file.size })
//                             };

//                             conn.send(chunkData);

//                             offset += slice.size; // Use actual slice size
//                             if (progressBar) progressBar.value = offset; // Update progress

//                             if (offset < file.size) {
//                                 // Use setTimeout to yield to the event loop, preventing potential UI freezes for large files
//                                 setTimeout(readSlice, 0);
//                             } else {
//                                 console.log(`Finished sending ${file.name} to ${conn.peer}`);
//                                 // Optionally update UI to show completion
//                                 li.textContent = `Sent ${file.name} to ${conn.peer} (${formatBytes(file.size)})`;
//                             }
//                         } catch (error) {
//                             console.error(`Error sending chunk for ${file.name} to ${conn.peer}:`, error);
//                             li.textContent = `Sending ${file.name} to ${conn.peer}: Error`;
//                             // Attempt to close connection or handle error appropriately
//                             conn.close(); // Or implement more robust error handling
//                         }
//                     };

//                     reader.onerror = (err) => {
//                         console.error(`FileReader error for ${file.name}:`, err);
//                         alert(`Error reading file ${file.name}.`);
//                         li.textContent = `Sending ${file.name} to ${conn.peer}: Read Error`;
//                     };

//                     reader.readAsArrayBuffer(slice);
//                 }
//                 readSlice(); // Start the sending process
//             });
//         });

//         // Clear selection after initiating send
//         selectedFiles = [];
//         fileList.innerHTML = '<li>No files selected.</li>';
//     });

//     // --- Receive & Reassemble ---
//     function handleData(data, conn) {
//         // Check if it's our file chunk type
//         if (data.type === 'file-chunk' && data.fileName && data.chunk) {
//             const key = `${conn.peer}:${data.fileName}`;

//             // --- First Chunk Handling ---
//             if (data.totalSize && !incomingTransfers[key]) {
//                 // Create progress UI element
//                 const li = document.createElement('li');
//                 li.id = `receive-${key.replace(':', '-')}`; // Create a valid DOM ID
//                 const label = document.createTextNode(`Receiving ${data.fileName} from ${conn.peer}: `);
//                 const progress = document.createElement('progress');
//                 progress.max = data.totalSize;
//                 progress.value = 0;
//                 li.append(label, progress);
//                 receivedFiles.appendChild(li); // Add to the received files list

//                 // Initialize transfer state
//                 incomingTransfers[key] = {
//                     buffer: [],
//                     receivedBytes: 0,
//                     totalSize: data.totalSize,
//                     progressElement: li // Store reference to the UI element
//                 };
//                 console.log(`Started receiving ${data.fileName} (${formatBytes(data.totalSize)}) from ${conn.peer}`);
//             }

//             // --- Subsequent Chunk Handling ---
//             const transfer = incomingTransfers[key];
//             if (transfer) {
//                 transfer.buffer.push(data.chunk);
//                 transfer.receivedBytes += data.chunk.byteLength;

//                 // Update progress bar
//                 const progressBar = transfer.progressElement.querySelector('progress');
//                 if (progressBar) {
//                     progressBar.value = transfer.receivedBytes;
//                 } else {
//                      console.warn("Progress bar not found for", key); // Should not happen
//                 }


//                 // --- Last Chunk / Completion ---
//                 if (data.isLast) {
//                     if (transfer.receivedBytes === transfer.totalSize) {
//                         const blob = new Blob(transfer.buffer);
//                         const url = URL.createObjectURL(blob);

//                         // Replace progress bar with download link
//                         const a = document.createElement('a');
//                         a.href = url;
//                         a.download = data.fileName;
//                         a.textContent = `${data.fileName} (${formatBytes(transfer.totalSize)})`;
//                         transfer.progressElement.innerHTML = ''; // Clear progress bar
//                         transfer.progressElement.append(a, document.createTextNode(` (from ${conn.peer})`));

//                         console.log(`Finished receiving ${data.fileName} from ${conn.peer}`);
//                     } else {
//                         console.error(`File transfer incomplete for ${data.fileName} from ${conn.peer}. Expected ${transfer.totalSize} bytes, received ${transfer.receivedBytes}`);
//                         transfer.progressElement.textContent = `Error receiving ${data.fileName} from ${conn.peer} (Incomplete)`;
//                         // Optionally remove the element after a delay or leave it as an error indicator
//                     }
//                     // Clean up transfer state
//                     delete incomingTransfers[key];
//                 }
//             } else if (!data.totalSize) {
//                 // Received a chunk before the initial metadata chunk - might happen with packet loss/reordering
//                 // Or if the sender didn't send totalSize correctly.
//                 console.warn(`Received chunk for ${data.fileName} from ${conn.peer} without prior metadata. Discarding.`);
//                 // Request retransmission or handle error? For now, just log it.
//             }
//         } else {
//             // Handle other data types if needed
//             console.log('Received unknown data:', data);
//         }
//     }

//     // --- Cleanup for Incomplete Transfers ---
//     function cleanupIncompleteTransfers(peerId) {
//         for (const key in incomingTransfers) {
//             if (key.startsWith(peerId + ':')) {
//                 const transfer = incomingTransfers[key];
//                 if (transfer.progressElement) {
//                     // Update UI to show failure
//                     transfer.progressElement.textContent = `Failed receiving ${key.split(':')[1]} from ${peerId} (Disconnected)`;
//                     // Optionally remove the element after a delay
//                     // setTimeout(() => transfer.progressElement.remove(), 5000);
//                 }
//                 delete incomingTransfers[key];
//                 console.log(`Cleaned up incomplete transfer ${key}`);
//             }
//         }
//          // Also clean up any sending progress bars related to this peer
//         const sendingItems = sendProgressList.querySelectorAll('li');
//         sendingItems.forEach(item => {
//             if (item.id.includes(`-${peerId}-`)) {
//                  // Check if it's still showing a progress bar (i.e., not completed/failed yet)
//                  if (item.querySelector('progress')) {
//                      item.textContent += " - Failed (Disconnected)";
//                  }
//             }
//         });
//     }

//     // --- Utility Function ---
//     function formatBytes(bytes, decimals = 2) {
//         if (bytes === 0) return '0 Bytes';
//         const k = 1024;
//         const dm = decimals < 0 ? 0 : decimals;
//         const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
//         const i = Math.floor(Math.log(bytes) / Math.log(k));
//         return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
//     }

// }); // End DOMContentLoaded
// index.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const DISCOVERY_ID = 'localshare-discovery-room-v1'; // ID for the discovery "hub"

    // --- Globals & DOM References ---
    // Peer instance - allow ID specification for the hub
    let peerId = undefined; // Default: let PeerJS generate
    // Basic check if someone tries to manually set the ID via URL hash
    if (window.location.hash === `#${DISCOVERY_ID}`) {
        peerId = DISCOVERY_ID;
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

        if (err.type === 'peer-unavailable') {
            const attemptedPeer = err.message.match(/Could not connect to peer (.*?)$/);
            if (attemptedPeer && attemptedPeer[1] === DISCOVERY_ID) {
                 console.warn(`Discovery Hub (${DISCOVERY_ID}) not found or offline.`);
                 // Update status instead of alerting, as this is expected if hub isn't running
                 status.innerHTML += ' <span style="color: orange;">(Discovery Hub not found)</span>';
                 alertMsg = ''; // Don't alert for this specific case
            } else {
                 alertMsg = `Could not connect to peer. Peer ID might be incorrect or the peer is offline.`;
            }
        } else if (err.type === 'network') {
             alertMsg = `Network error. Please check your connection.`;
        } else if (err.type === 'unavailable-id' && err.message.includes(DISCOVERY_ID)) {
             alertMsg = `Could not claim Discovery Hub ID (${DISCOVERY_ID}). Another hub might already be running. Please start as a regular client.`;
             // Disable hub functionality for this instance if it failed to claim the ID
             isHub = false;
        } else if (err.type === 'disconnected') {
             alertMsg = `Disconnected from the PeerJS signaling server. Please refresh.`;
        } else if (err.type === 'server-error') {
             alertMsg = `Error connecting to the PeerJS signaling server.`;
        }

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
        if (isHub || discoveryHubConnection || !peer.id || peer.id === DISCOVERY_ID) return;

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
                // Implement optional retry logic here if desired
                // console.log('Will attempt to reconnect to hub in 10 seconds...');
                // setTimeout(attemptConnectToHub, 10000); // Retry after 10 seconds
            }
        });

        hubConn.on('error', (err) => {
            console.error(`Discovery hub connection error: ${err.type}`);
            if (discoveryHubConnection === hubConn) {
                discoveryHubConnection = null;
                updatePeerList(); // Update status to show hub error
                // Optional retry logic here, maybe with exponential backoff
            }
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
            } else if (!discoveryHubConnection && peer.id !== DISCOVERY_ID) {
                // Check if we are in the process of connecting
                const hubConnAttempt = peer.connections[DISCOVERY_ID]?.[0]; // PeerJS stores connections in arrays
                if (hubConnAttempt?.connecting) {
                     statusContent += ' <span style="color: orange;">(Connecting to Hub...)</span>';
                } else {
                     statusContent += ' <span style="color: grey;">(Hub Disconnected/Not Found)</span>';
                }
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
            if (!isHub && !discoveryHubConnection?.open && peer.id && peer.id !== DISCOVERY_ID) {
                 peerList.innerHTML += '<li style="color: grey;">Waiting for peers via Hub or manual connection...</li>';
            } else if (isHub) {
                 peerList.innerHTML += '<li style="color: blue;">Waiting for clients to connect to the Hub...</li>';
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
                        const blob = new Blob(transfer.buffer, { type: file.type }); // Use file type if available? PeerJS might not preserve it.
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