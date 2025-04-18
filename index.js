// index.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Globals & DOM References ---
    const peer = new Peer();
    const connections = {}; // { peerId: DataConnection }
    const fileInput = document.getElementById('file-input');
    const sendButton = document.getElementById('send-button');
    const fileList = document.getElementById('file-list');
    const status = document.getElementById('status');
    const peerList = document.getElementById('peer-list');
    const receivedFiles = document.getElementById('received-files'); // This will now hold progress bars too

    let selectedFiles = [];
    const sendProgressList = document.createElement('ul');
    sendProgressList.id = 'send-progress-list';
    fileList.parentNode.insertBefore(sendProgressList, fileList.nextSibling);

    // Buffer and progress tracking for incoming files
    // Structure: { "peerId:fileName": { buffer: [ArrayBuffer,...], receivedBytes: 0, totalSize: 0, progressElement: Element } }
    const incomingTransfers = {};

    // --- Peer Setup ---
    peer.on('open', id => {
        status.innerHTML = `Your ID: <code>${id}</code> <button id="copy-id">Copy ID</button>`;
        document.getElementById('copy-id').addEventListener('click', () => {
            navigator.clipboard.writeText(id).then(() => {
                // Provide visual feedback without replacing the ID
                const copyButton = document.getElementById('copy-id');
                const originalText = copyButton.textContent;
                copyButton.textContent = 'Copied! 👍';
                setTimeout(() => { copyButton.textContent = originalText; }, 1500);
            }, (err) => {
                console.error('Failed to copy ID: ', err);
                alert('Failed to copy ID.');
            });
        });
    });

    peer.on('error', err => {
        console.error("PeerJS error:", err);
        // Display more specific errors if possible
        if (err.type === 'peer-unavailable') {
            alert(`Could not connect to peer. Peer ID might be incorrect or the peer is offline.`);
        } else if (err.type === 'network') {
             alert(`Network error. Please check your connection.`);
        } else {
            alert(`An error occurred with PeerJS: ${err.type}`);
        }
         // Reset connection UI if trying to connect
        const connectInput = document.getElementById('peer-id-input');
        const connectButton = document.getElementById('connect-button');
        if (connectInput) connectInput.value = '';
        if (connectButton) connectButton.disabled = false;
    });


    peer.on('connection', conn => setupConnection(conn));

    // --- Dial-in UI ---
    const connectInput = document.createElement('input');
    const connectButton = document.createElement('button');
    connectInput.id = 'peer-id-input';
    connectInput.placeholder = 'Enter peer ID…';
    connectInput.style.marginRight = '8px';
    connectButton.id = 'connect-button';
    connectButton.textContent = 'Connect';
    document.getElementById('connection-section').append(connectInput, connectButton);

    connectButton.addEventListener('click', () => {
        const remoteId = connectInput.value.trim();
        if (!remoteId) return alert('Please enter a peer ID.');
        if (connections[remoteId]) return alert('Already connected to ' + remoteId);
        if (remoteId === peer.id) return alert("You cannot connect to yourself.");

        console.log(`Attempting to connect to ${remoteId}...`);
        // Disable button while attempting connection
        connectButton.disabled = true;
        connectButton.textContent = 'Connecting...';

        const conn = peer.connect(remoteId, { reliable: true });

        // Handle connection errors specifically for this attempt
        conn.on('error', (err) => {
            console.error(`Connection error with ${remoteId}:`, err);
            alert(`Failed to connect to ${remoteId}. Error: ${err.type}`);
            connectButton.disabled = false; // Re-enable button
            connectButton.textContent = 'Connect';
        });

        // If connection opens, setupConnection will handle the rest
        // If it fails to open after a timeout, PeerJS might trigger a peer-unavailable error on the main peer object
        setupConnection(conn);
    });

    // --- Connection Handler ---
    function setupConnection(conn) {
        conn.on('open', () => {
            console.log(`Connection opened with ${conn.peer}`);
            connections[conn.peer] = conn;
            updatePeerList();
            conn.on('data', data => handleData(data, conn));

            // Reset connection button state if it was the one initiating
            const connectButton = document.getElementById('connect-button');
            const connectInput = document.getElementById('peer-id-input');
            if (connectButton && connectInput.value === conn.peer) {
                 connectButton.disabled = false;
                 connectButton.textContent = 'Connect';
                 connectInput.value = ''; // Clear input after successful connection
            }
        });

        conn.on('close', () => {
            console.log(`Connection closed with ${conn.peer}`);
            delete connections[conn.peer];
            updatePeerList();
            // Clean up any incomplete transfers from this peer
            cleanupIncompleteTransfers(conn.peer);
        });

        // Add error handling for the specific connection
        conn.on('error', (err) => {
             console.error(`Error on connection with ${conn.peer}:`, err);
             // Optionally alert the user or just log it
             // alert(`Connection error with ${conn.peer}: ${err.type}`);
             // Ensure cleanup happens even on error-driven close
             if (connections[conn.peer]) {
                 delete connections[conn.peer];
                 updatePeerList();
                 cleanupIncompleteTransfers(conn.peer);
             }
        });
    }

    function updatePeerList() {
        peerList.innerHTML = '';
        const peers = Object.keys(connections);
        if (!peers.length) {
            // Keep the ID visible even when not connected
            if (peer.id) {
                 status.innerHTML = `Your ID: <code>${peer.id}</code> <button id="copy-id">Copy ID</button>`;
                 // Re-attach listener as innerHTML wipes it
                 document.getElementById('copy-id')?.addEventListener('click', () => {
                     navigator.clipboard.writeText(peer.id).then(() => {
                         const copyButton = document.getElementById('copy-id');
                         const originalText = copyButton.textContent;
                         copyButton.textContent = 'Copied! 👍';
                         setTimeout(() => { copyButton.textContent = originalText; }, 1500);
                     });
                 });
            } else {
                 status.textContent = 'Initializing Peer...'; // Or similar state
            }
            return;
        }
        // Keep ID visible when connected too
        status.innerHTML = `Your ID: <code>${peer.id}</code> <button id="copy-id">Copy ID</button> | Connected to: ${peers.join(', ')}`;
         document.getElementById('copy-id')?.addEventListener('click', () => {
             navigator.clipboard.writeText(peer.id).then(() => {
                 const copyButton = document.getElementById('copy-id');
                 const originalText = copyButton.textContent;
                 copyButton.textContent = 'Copied! 👍';
                 setTimeout(() => { copyButton.textContent = originalText; }, 1500);
             });
         });

        peers.forEach(pid => {
            const li = document.createElement('li');
            li.textContent = pid;
            // Add a disconnect button
            const disconnectBtn = document.createElement('button');
            disconnectBtn.textContent = 'Disconnect';
            disconnectBtn.style.marginLeft = '10px';
            disconnectBtn.onclick = () => {
                if (connections[pid]) {
                    connections[pid].close(); // This will trigger the 'close' event
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
        sendProgressList.innerHTML = ''; // Clear previous send progress
        selectedFiles.forEach(f => {
            const li = document.createElement('li');
            li.textContent = `${f.name} (${formatBytes(f.size)})`;
            fileList.appendChild(li);
        });
        // Reset file input value to allow selecting the same file again
        e.target.value = null;
    });

    // --- Send Files with Progress ---
    sendButton.addEventListener('click', () => {
        if (!selectedFiles.length) return alert('No files selected.');
        const peers = Object.values(connections);
        if (!peers.length) return alert('No peers connected.');

        // Clear previous send progress UI before starting new sends
        sendProgressList.innerHTML = '';

        selectedFiles.forEach(file => {
            // Send to each connected peer
            peers.forEach(conn => {
                // UI: create progress element for *this specific send operation*
                const progressId = `send-${conn.peer}-${file.name}`;
                let li = document.getElementById(progressId);
                if (!li) { // Create if it doesn't exist for this file-peer combo
                    li = document.createElement('li');
                    li.id = progressId;
                    const label = document.createTextNode(`Sending ${file.name} to ${conn.peer}: `);
                    const progress = document.createElement('progress');
                    progress.max = file.size;
                    progress.value = 0;
                    li.append(label, progress);
                    sendProgressList.appendChild(li);
                }
                const progressBar = li.querySelector('progress');

                // Send in 64KB chunks
                const chunkSize = 64 * 1024; // 64KB
                let offset = 0;

                function readSlice() {
                    if (!connections[conn.peer]) {
                        console.warn(`Connection to ${conn.peer} lost during send.`);
                        // Optionally update UI to show failure for this peer
                        li.textContent = `Sending ${file.name} to ${conn.peer}: Failed (Disconnected)`;
                        return; // Stop sending to this peer
                    }

                    const slice = file.slice(offset, offset + chunkSize);
                    const reader = new FileReader();

                    reader.onload = evt => {
                        if (!connections[conn.peer]) { // Check again before sending
                           console.warn(`Connection to ${conn.peer} lost just before sending chunk.`);
                           li.textContent = `Sending ${file.name} to ${conn.peer}: Failed (Disconnected)`;
                           return;
                        }
                        try {
                            const isLastChunk = offset + slice.size >= file.size;
                            const chunkData = {
                                type: 'file-chunk', // Add a type for better handling
                                fileName: file.name,
                                chunk: evt.target.result,
                                isLast: isLastChunk,
                                // Send total size only with the first chunk
                                ...(offset === 0 && { totalSize: file.size })
                            };

                            conn.send(chunkData);

                            offset += slice.size; // Use actual slice size
                            if (progressBar) progressBar.value = offset; // Update progress

                            if (offset < file.size) {
                                // Use setTimeout to yield to the event loop, preventing potential UI freezes for large files
                                setTimeout(readSlice, 0);
                            } else {
                                console.log(`Finished sending ${file.name} to ${conn.peer}`);
                                // Optionally update UI to show completion
                                li.textContent = `Sent ${file.name} to ${conn.peer} (${formatBytes(file.size)})`;
                            }
                        } catch (error) {
                            console.error(`Error sending chunk for ${file.name} to ${conn.peer}:`, error);
                            li.textContent = `Sending ${file.name} to ${conn.peer}: Error`;
                            // Attempt to close connection or handle error appropriately
                            conn.close(); // Or implement more robust error handling
                        }
                    };

                    reader.onerror = (err) => {
                        console.error(`FileReader error for ${file.name}:`, err);
                        alert(`Error reading file ${file.name}.`);
                        li.textContent = `Sending ${file.name} to ${conn.peer}: Read Error`;
                    };

                    reader.readAsArrayBuffer(slice);
                }
                readSlice(); // Start the sending process
            });
        });

        // Clear selection after initiating send
        selectedFiles = [];
        fileList.innerHTML = '<li>No files selected.</li>';
    });

    // --- Receive & Reassemble ---
    function handleData(data, conn) {
        // Check if it's our file chunk type
        if (data.type === 'file-chunk' && data.fileName && data.chunk) {
            const key = `${conn.peer}:${data.fileName}`;

            // --- First Chunk Handling ---
            if (data.totalSize && !incomingTransfers[key]) {
                // Create progress UI element
                const li = document.createElement('li');
                li.id = `receive-${key.replace(':', '-')}`; // Create a valid DOM ID
                const label = document.createTextNode(`Receiving ${data.fileName} from ${conn.peer}: `);
                const progress = document.createElement('progress');
                progress.max = data.totalSize;
                progress.value = 0;
                li.append(label, progress);
                receivedFiles.appendChild(li); // Add to the received files list

                // Initialize transfer state
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
                transfer.buffer.push(data.chunk);
                transfer.receivedBytes += data.chunk.byteLength;

                // Update progress bar
                const progressBar = transfer.progressElement.querySelector('progress');
                if (progressBar) {
                    progressBar.value = transfer.receivedBytes;
                } else {
                     console.warn("Progress bar not found for", key); // Should not happen
                }


                // --- Last Chunk / Completion ---
                if (data.isLast) {
                    if (transfer.receivedBytes === transfer.totalSize) {
                        const blob = new Blob(transfer.buffer);
                        const url = URL.createObjectURL(blob);

                        // Replace progress bar with download link
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = data.fileName;
                        a.textContent = `${data.fileName} (${formatBytes(transfer.totalSize)})`;
                        transfer.progressElement.innerHTML = ''; // Clear progress bar
                        transfer.progressElement.append(a, document.createTextNode(` (from ${conn.peer})`));

                        console.log(`Finished receiving ${data.fileName} from ${conn.peer}`);
                    } else {
                        console.error(`File transfer incomplete for ${data.fileName} from ${conn.peer}. Expected ${transfer.totalSize} bytes, received ${transfer.receivedBytes}`);
                        transfer.progressElement.textContent = `Error receiving ${data.fileName} from ${conn.peer} (Incomplete)`;
                        // Optionally remove the element after a delay or leave it as an error indicator
                    }
                    // Clean up transfer state
                    delete incomingTransfers[key];
                }
            } else if (!data.totalSize) {
                // Received a chunk before the initial metadata chunk - might happen with packet loss/reordering
                // Or if the sender didn't send totalSize correctly.
                console.warn(`Received chunk for ${data.fileName} from ${conn.peer} without prior metadata. Discarding.`);
                // Request retransmission or handle error? For now, just log it.
            }
        } else {
            // Handle other data types if needed
            console.log('Received unknown data:', data);
        }
    }

    // --- Cleanup for Incomplete Transfers ---
    function cleanupIncompleteTransfers(peerId) {
        for (const key in incomingTransfers) {
            if (key.startsWith(peerId + ':')) {
                const transfer = incomingTransfers[key];
                if (transfer.progressElement) {
                    // Update UI to show failure
                    transfer.progressElement.textContent = `Failed receiving ${key.split(':')[1]} from ${peerId} (Disconnected)`;
                    // Optionally remove the element after a delay
                    // setTimeout(() => transfer.progressElement.remove(), 5000);
                }
                delete incomingTransfers[key];
                console.log(`Cleaned up incomplete transfer ${key}`);
            }
        }
         // Also clean up any sending progress bars related to this peer
        const sendingItems = sendProgressList.querySelectorAll('li');
        sendingItems.forEach(item => {
            if (item.id.includes(`-${peerId}-`)) {
                 // Check if it's still showing a progress bar (i.e., not completed/failed yet)
                 if (item.querySelector('progress')) {
                     item.textContent += " - Failed (Disconnected)";
                 }
            }
        });
    }

    // --- Utility Function ---
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

}); // End DOMContentLoaded