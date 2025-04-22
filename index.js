// index.js

document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('popup');
    let popupTimeoutId = null; // Variable to store the timeout ID

    function displayPopup(content){
        // 1. Clear any existing timeout
        if (popupTimeoutId) {
            clearTimeout(popupTimeoutId);
            popupTimeoutId = null; // Reset the ID
        }

        // 2. Update content and show the popup
        popup.innerHTML = content;
        popup.classList.add('show');

        // 3. Set a new timeout to hide the popup
        popupTimeoutId = setTimeout(() => {
            popup.classList.remove('show');
            // Optional: Clear content after hiding animation completes
            setTimeout(() => {
                if (!popup.classList.contains('show')) { // Check if it wasn't shown again quickly
                   popup.innerHTML = '';
                }
            }, 500); // Adjust delay based on your CSS transition duration (if any)
            popupTimeoutId = null; // Reset the ID after the timeout runs
        }, 3000); // Hide after 3 seconds from the *last* call
    }

    // --- Cute Name Generation ---
const adjectives = [
    // Original
    'Sparkly', 'Fluffy', 'Happy', 'Brave', 'Clever', 'Witty', 'Sunny', 'Cozy', 'Gentle', 'Lucky',
    'Chirpy', 'Gleeful', 'Jolly', 'Dazzling', 'Radiant', 'Vibrant', 'Whimsical', 'Mystic', 'Zesty', 'Jubilant',
    'Peppy', 'Snuggly', 'Bouncy', 'Cheeky', 'Silly', 'Goofy', 'Quirky', 'Daring', 'Nimble', 'Swift',
    'Mighty', 'Tiny', 'Giant', 'Curious', 'Dreamy', 'Eager', 'Fierce', 'Grumpy', 'Jumpy', 'Kind',
    'Lively', 'Magical', 'Nifty', 'Playful', 'Quiet', 'Rambunctious', 'Sassy', 'Tricky', 'Upbeat', 'Wacky',
    'Yummy', 'Zealous',
    // Added
    'Adorable', 'Amused', 'Blissful', 'Bonny', 'Bubbly', 'Calm', 'Charming', 'Cheerful', 'Cuddly', 'Dainty',
    'Dancing', 'Darling', 'Delicate', 'Devoted', 'Dippy', 'Dizzy', 'Dopey', 'Elegant', 'Enchanted', 'Energetic',
    'Excited', 'Fancy', 'Fearless', 'Feisty', 'Floppy', 'Friendly', 'Frisky', 'Funny', 'Fuzzy', 'Gallant',
    'Giddy', 'Giggling', 'Glamorous', 'Glimmering', 'Glittery', 'Glorious', 'Golden', 'Graceful', 'Grand', 'Groovy',
    'Handsome', 'Helpful', 'Honest', 'Hopeful', 'Huggable', 'Humble', 'Hungry', 'Innocent', 'Inspired', 'Intrepid',
    'Joyful', 'Keen', 'Laughing', 'Lazy', 'Little', 'Loyal', 'Luminous', 'Merry', 'Mischievous', 'Modest',
    'Musical', 'Neat', 'Nice', 'Noble', 'Optimistic', 'Peaceful', 'Perfect', 'Plucky', 'Polite', 'Positive',
    'Precious', 'Pretty', 'Proud', 'Puffy', 'Quick', 'Relaxed', 'Rosy', 'Round', 'Royal', 'Rusty',
    'Shiny', 'Shy', 'Singing', 'Sleepy', 'Smiling', 'Smooth', 'Snappy', 'Sneaky', 'Soft', 'Speedy',
    'Spirited', 'Spunky', 'Starry', 'Stout', 'Sturdy', 'Sweet', 'Talented', 'Thankful', 'Thoughtful', 'Thrilled',
    'Tidy', 'Timeless', 'Trusty', 'Truthful', 'Twinkly', 'Velvet', 'Victorious', 'Warm', 'Wild', 'Wise',
    'Wonderful', 'Zany'
];

const nouns = [
    // Original
    'Panda', 'Unicorn', 'Kitten', 'Puppy', 'Fox', 'Badger', 'Sparrow', 'Dolphin', 'Otter', 'Rabbit',
    'Hedgehog', 'Firefly', 'Dragon', 'Griffin', 'Phoenix', 'Pegasus', 'Squirrel', 'Beaver', 'Owl', 'Eagle',
    'Tiger', 'Lion', 'Elephant', 'Monkey', 'Koala', 'Penguin', 'Seal', 'Whale', 'Shark', 'Octopus',
    'Jellyfish', 'Butterfly', 'Ladybug', 'Caterpillar', 'Bee', 'Ant', 'Spider', 'Frog', 'Turtle', 'Lizard',
    'Snake', 'Crocodile', 'Dinosaur', 'Robot', 'Alien', 'Ghost', 'Wizard', 'Sprite', 'Pixie', 'Gnome',
    'Elf', 'Fairy',
    // Added
    'Alpaca', 'Angel', 'Axolotl', 'Baboon', 'Bear', 'Beetle', 'Bluebird', 'Bobcat', 'Bumblebee', 'Bunny',
    'Camel', 'Canary', 'Capybara', 'Cardinal', 'Cheetah', 'Chihuahua', 'Chinchilla', 'Chipmunk', 'Clownfish', 'Cobra',
    'Cockatoo', 'Comet', 'Cookie', 'Coral', 'Cougar', 'Cow', 'Coyote', 'Crab', 'Crane', 'Cricket',
    'Cupcake', 'Deer', 'Diamond', 'Dingo', 'Donkey', 'Dove', 'Dragonfly', 'Duckling', 'Emu', 'Falcon',
    'Ferret', 'Finch', 'Flamingo', 'Flower', 'Flounder', 'Gazelle', 'Gecko', 'Gem', 'Gerbil', 'Gibbon',
    'Giraffe', 'Goat', 'Goldfish', 'Goose', 'Gopher', 'Gorilla', 'Grasshopper', 'Grouse', 'Guppy', 'Hamster',
    'Hare', 'Hawk', 'Hippo', 'Hornet', 'Horse', 'Hummingbird', 'Hyena', 'Ibex', 'Iguana', 'Impala',
    'Jackal', 'Jaguar', 'Jay', 'Kangaroo', 'Kingfisher', 'Kiwi', 'Lamb', 'Lark', 'Lemming', 'Lemur',
    'Leopard', 'Llama', 'Lobster', 'Locust', 'Loris', 'Lynx', 'Macaw', 'Magpie', 'Manatee', 'Mantis',
    'Marmot', 'Meerkat', 'Mermaid', 'Mockingbird', 'Mole', 'Mongoose', 'Moose', 'Mosquito', 'Moth', 'Mouse',
    'Muffin', 'Narwhal', 'Newt', 'Nightingale', 'Nymph', 'Ocelot', 'Opossum', 'Orca', 'Ostrich', 'Panther',
    'Papillon', 'Parakeet', 'Parrot', 'Partridge', 'Peacock', 'Pelican', 'Pheasant', 'Piglet', 'Pigeon', 'Pika',
    'Platypus', 'Pony', 'Poodle', 'Porcupine', 'Possum', 'Puffin', 'Pug', 'Puma', 'Quail', 'Quokka',
    'Raccoon', 'Ram', 'Rat', 'Raven', 'Reindeer', 'Rhino', 'Robin', 'Salamander', 'Salmon', 'Sandpiper',
    'Sardine', 'Scorpion', 'Seagull', 'Seahorse', 'Serpent', 'Sheep', 'Shrew', 'Shrimp', 'Skunk', 'Sloth',
    'Snail', 'Snowflake', 'Star', 'Starfish', 'Stingray', 'Stork', 'Sugarplum', 'Swallow', 'Swan', 'Tadpole',
    'Tapir', 'Tarsier', 'Termite', 'Terrier', 'Thrush', 'Toad', 'Toucan', 'Trout', 'Turkey', 'Viper',
    'Vole', 'Vulture', 'Wallaby', 'Walrus', 'Wasp', 'Weasel', 'Wombat', 'Woodpecker', 'Worm', 'Wren',
    'Yak', 'Zebra'
];

    function generateCuteName() {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        // Add a small random number for extra uniqueness, though collisions are unlikely
        const num = Math.floor(Math.random() * 90) + 10; // 10-99
        return `${adj} ${noun} ${num}`;
    }

    // --- Globals & DOM References ---
    let localPeerName = generateCuteName(); // Generate name immediately
    const peer = new Peer(); // Always let PeerJS generate the ID
    // Store connection object AND the remote peer's cute name
    // Structure: { peerId: { conn: DataConnection, name: string } }
    const connections = {};
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
    // Structure: { "peerId:fileName": { buffer: [...], receivedBytes: 0, totalSize: 0, progressElement: Element, peerName: string } }
    const incomingTransfers = {};

    // --- Peer Setup ---
    peer.on('open', id => {
        console.log(`PeerJS initialized. Your Name: ${localPeerName}, ID: ${id}`);
        // Update status to show name and ID
        status.innerHTML = `Your Name: <strong>${localPeerName}</strong> (ID: <code>${id}</code>) <button id="copy-id" title="Copy Peer ID"><i class='bi bi-copy'></i> Copy ID</button>`;
        document.getElementById('copy-id')?.addEventListener('click', () => copyPeerId(id));
        displayQrCode(id); // QR code still uses the ID for connection
        updatePeerList();
    });

    peer.on('error', err => {
        console.error("PeerJS error:", err);
        let alertMsg = `An error occurred with PeerJS: ${err.type}`;
        let peerIdentifier = 'peer'; // Default identifier

        if (err.type === 'peer-unavailable') {
            const attemptedPeer = err.message.match(/Could not connect to peer (.*?)$/);
            const attemptedPeerId = attemptedPeer ? attemptedPeer[1] : '';
            // Try to find the name if we attempted connection before error
            const peerName = connections[attemptedPeerId]?.name || attemptedPeerId;
            peerIdentifier = peerName || 'The peer';
            alertMsg = `Could not connect to ${peerIdentifier}. ID might be incorrect or the peer is offline.`;
        } else if (err.type === 'network') {
            alertMsg = `Network error. Please check your connection.`;
        } else if (err.type === 'unavailable-id') {
            alertMsg = `The generated Peer ID (${peer.id}) is already taken. Please refresh the page to get a new ID.`;
             localPeerName = generateCuteName(); // Regenerate name on ID conflict
        } else if (err.type === 'disconnected') {
            alertMsg = `Disconnected from the PeerJS signaling server. Please refresh.`;
        } else if (err.type === 'server-error') {
            alertMsg = `Error connecting to the PeerJS signaling server.`;
        }

        if (alertMsg) displayPopup("<i class='bi bi-info-circle-fill'></i> " + alertMsg);

        // Reset manual connection UI elements
        const connectInput = document.getElementById('peer-id-input');
        const connectButton = document.getElementById('connect-button');
        if (connectInput) connectInput.value = '';
        if (connectButton && connectButton.textContent === 'Connecting...') {
            connectButton.disabled = false;
            connectButton.innerHTML = '<i class="bi bi-wifi"></i> Connect';
        }
        updatePeerList(); // Update list to reflect potential disconnections
    });


    peer.on('connection', conn => {
        // Metadata should contain the remote peer's name if *they* initiated
        const remotePeerName = conn.metadata?.name || `Peer_${conn.peer.substring(0, 4)}`;
        console.log(`Incoming connection from ${remotePeerName} (${conn.peer}) with metadata:`, conn.metadata);
        console.log(`Accepting data connection from ${remotePeerName} (${conn.peer})`);
        setupConnection(conn, remotePeerName); // Pass the name (might be placeholder)
    });

    // --- Dial-in UI (Manual Connection) ---
    const connectInput = document.createElement('input');
    const connectButton = document.createElement('button');
    connectInput.id = 'peer-id-input';
    connectInput.placeholder = 'Enter peer ID manually…';
    connectInput.style.marginRight = '8px';
    connectButton.id = 'connect-button';
    connectButton.innerHTML = '<i class="bi bi-wifi"></i> Connect';
    document.getElementById('connection-section').append(connectInput, connectButton);

    connectButton.addEventListener('click', () => {
        const remoteId = connectInput.value.trim();
        if (!remoteId) return displayPopup("<i class='bi bi-info-circle-fill'></i> Please enter a peer ID.");
        if (connections[remoteId]) return displayPopup(`<i class='bi bi-info-circle-fill'></i> Already connected to ${connections[remoteId].name} (${remoteId})`);
        if (remoteId === peer.id) return displayPopup("<i class='bi bi-info-circle-fill'></i> You cannot connect to yourself.");

        console.log(`Attempting to connect manually to ${remoteId}...`);
        connectButton.disabled = true;
        connectButton.textContent = 'Connecting...';

        // Send our cute name in the metadata when initiating
        const conn = peer.connect(remoteId, {
             reliable: true,
             metadata: { name: localPeerName }
        });

        // We don't know the remote name yet for sure, will get it via 'peer-name' message or use default
        conn.on('error', (err) => {
            console.error(`Manual connection error with ${remoteId}:`, err);
            // Use ID here as we might not have the name yet
            displayPopup(`<i class='bi bi-info-circle-fill'></i> Failed to connect to ${remoteId}. Error: ${err.type}`);
            if (connectInput.value === remoteId || connectButton.textContent === 'Connecting...') {
                 connectButton.disabled = false;
                 connectButton.innerHTML = '<i class="bi bi-wifi"></i> Connect';
            }
        });
        // Pass a temporary name/placeholder until 'open' or 'peer-name' message confirms
        setupConnection(conn, `Peer_${remoteId.substring(0, 4)}`);
    });

    // --- Connection Handler (for DATA connections ONLY) ---
    // Added remotePeerName parameter (this is the initial name, might be updated)
    function setupConnection(conn, initialRemotePeerName) {
        const remotePeerId = conn.peer;

        // Check using the new structure
        if (connections[remotePeerId]) {
            const existingName = connections[remotePeerId].name;
            console.log(`Already have an active data connection to ${existingName} (${remotePeerId}). Ignoring duplicate setup request.`);
            // Close the new incoming connection if it's different from the existing one
            if (connections[remotePeerId].conn !== conn) {
                 conn.close();
            }
            return;
        }

        console.log(`Setting up data connection with ${initialRemotePeerName} (${remotePeerId})`);
        // Store connection and initial name
        connections[remotePeerId] = { conn: conn, name: initialRemotePeerName };
        updatePeerList(); // Update UI immediately with the initial name

        conn.on('open', () => {
            // Connection is open, now exchange names for confirmation/update
            const currentName = connections[remotePeerId]?.name || initialRemotePeerName; // Use stored name if available
            console.log(`Data connection established with ${currentName} (${remotePeerId}). Sending/Receiving names.`);

            // *** MODIFICATION START: Send local name ***
            try {
                console.log(`Sending name '${localPeerName}' to ${currentName} (${remotePeerId})`);
                conn.send({ type: 'peer-name', name: localPeerName });
            } catch (error) {
                console.error(`Error sending name to ${currentName} (${remotePeerId}):`, error);
            }
            // *** MODIFICATION END ***

            // Update name if metadata provides a different one (e.g., incoming connection case)
            // This might be overwritten shortly by the 'peer-name' message, which is fine.
            const metadataName = conn.metadata?.name;
            if (metadataName && connections[remotePeerId] && connections[remotePeerId].name !== metadataName) {
                 console.log(`Updating name for ${remotePeerId} from metadata: ${metadataName}`);
                 connections[remotePeerId].name = metadataName;
                 updatePeerList(); // Update list again if name changed via metadata
            }

            // Display initial connection popup (name might update again soon)
            displayPopup(`<i class='bi bi-check-circle-fill'></i> Connected to ${currentName}`);

            // Reset manual connection button if applicable
            const connectButton = document.getElementById('connect-button');
            const connectInput = document.getElementById('peer-id-input');
            if (connectButton && connectInput.value === remotePeerId) {
                 connectButton.disabled = false;
                 connectButton.innerHTML = '<i class="bi bi-wifi"></i> Connect';
                 connectInput.value = '';
            }
        });

        conn.on('data', data => handleData(data, conn)); // Pass conn to get peerId and name

        conn.on('close', () => {
            const closedPeerName = connections[remotePeerId]?.name || remotePeerId;
            console.log(`Data connection closed with ${closedPeerName} (${remotePeerId})`);
            if (connections[remotePeerId]) {
                delete connections[remotePeerId];
                updatePeerList();
                cleanupIncompleteTransfers(remotePeerId, closedPeerName); // Pass name for cleanup messages
                displayPopup(`<i class='bi bi-info-circle-fill'></i> Disconnected from ${closedPeerName}`);
            }
        });

        conn.on('error', (err) => {
             const errorPeerName = connections[remotePeerId]?.name || remotePeerId;
             console.error(`Error on data connection with ${errorPeerName} (${remotePeerId}):`, err);
             displayPopup(`<i class='bi bi-exclamation-triangle-fill'></i> Connection error with ${errorPeerName}: ${err.type}`);
             if (connections[remotePeerId]) {
                 delete connections[remotePeerId];
                 updatePeerList();
                 cleanupIncompleteTransfers(remotePeerId, errorPeerName); // Pass name
             }
        });
    }

    // --- UI Updates & Utilities ---

    function copyPeerId(id) {
        if (!id) return;
        navigator.clipboard.writeText(id).then(() => {
            const copyButton = document.getElementById('copy-id');
            if (!copyButton) return;
            const originalContent = copyButton.innerHTML; // Store innerHTML
            const originalTitle = copyButton.title;
            copyButton.innerHTML = "<i class='bi bi-check-lg'></i> Copied!";
            copyButton.title = 'Copied!';
            setTimeout(() => {
                const currentCopyButton = document.getElementById('copy-id');
                if (currentCopyButton && currentCopyButton.title === 'Copied!') { // Check if it's still the 'Copied!' state
                    currentCopyButton.innerHTML = originalContent;
                    currentCopyButton.title = originalTitle;
                }
            }, 1500);
        }, (err) => {
            console.error('Failed to copy ID: ', err);
            displayPopup("<i class='bi bi-info-circle-fill'></i> Failed to copy ID.");
        });
    }

    function displayQrCode(id) {
        // ... (QR code generation remains the same, using the ID)
        if (!id || !qrCodeCanvas || !qrCodeContainer) {
            console.warn("Cannot display QR code: Missing ID or canvas/container element.");
            if (qrCodeContainer) qrCodeContainer.style.display = 'none';
            return;
        }
        if (typeof QRCode === 'undefined') {
            console.error("QRCode library is not loaded. Cannot generate QR code.");
            qrCodeContainer.innerHTML = '<p>Error: QR Code library not loaded.</p>';
            qrCodeContainer.style.display = 'block';
            return;
        }
        const qrCodeColors = { dark: "#2fd366", light: "#0000" };
        QRCode.toCanvas(qrCodeCanvas, id, { width: 160, margin: 1, color: qrCodeColors }, (error) => {
            if (error) {
                console.error("QR Code generation failed:", error);
                qrCodeContainer.innerHTML = '<p>Error generating QR code.</p>';
                qrCodeContainer.style.display = 'block';
            } else {
                console.log('QR Code generated successfully.');
                qrCodeContainer.style.display = 'block';
            }
        });
    }

    function updatePeerList() {
        // Update status line first
        let statusContent = '';
        if (peer.id) {
            // Show Name, ID, and Copy Button
            statusContent = `Your Name: <strong>${localPeerName}</strong> (ID: <code>${peer.id}</code>) <button id="copy-id" title="Copy Peer ID"><i class='bi bi-copy'></i> Copy ID</button>`;
        } else {
            statusContent = 'Initializing Peer...';
        }
        status.innerHTML = statusContent;

        // Re-attach copy listener if the button was recreated
        const copyBtn = document.getElementById('copy-id');
        if (copyBtn) {
            const currentPeerId = peer.id; // Capture current ID for the listener
            copyBtn.addEventListener('click', () => copyPeerId(currentPeerId));
        }

        // Update connected peers list
        peerList.innerHTML = ''; // Clear current list
        const connectedPeers = Object.entries(connections); // Get [peerId, {conn, name}] pairs

        if (!connectedPeers.length) {
            peerList.innerHTML = '<li>No active connections.</li>';
            peerList.innerHTML += '<li>Share your QR code or ID, or connect manually.</li>';
            return;
        }

        connectedPeers.forEach(([pid, data]) => {
            const li = document.createElement('li');
            // Display the cute name prominently, maybe with ID hint
            li.innerHTML = `<strong>${data.name}</strong>`; // Use innerHTML to allow strong tag

            const disconnectBtn = document.createElement('button');
            disconnectBtn.innerHTML = '<i class="bi bi-x"></i> Disconnect'; // Use icon
            disconnectBtn.title = `Disconnect from ${data.name}`;
            disconnectBtn.style.marginLeft = '10px';
            disconnectBtn.onclick = () => {
                if (connections[pid]) {
                    console.log(`Manually disconnecting from ${data.name} (${pid})`);
                    connections[pid].conn.close(); // Close the actual connection
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
        sendProgressList.innerHTML = ''; // Clear potential previous send progress
        if (selectedFiles.length === 0) {
             fileList.innerHTML = '<li>No files selected.</li>';
             return;
        }
        selectedFiles.forEach(f => {
            const li = document.createElement('li');
            li.textContent = `${f.name} (${formatBytes(f.size)})`;
            fileList.appendChild(li);
        });
        e.target.value = null; // Allow selecting the same file again
    });

    // --- Send Files with Progress ---
    sendButton.addEventListener('click', () => {
        if (!selectedFiles.length) return displayPopup("<i class='bi bi-info-circle-fill'></i> No files selected.");
        // Get connection data {conn, name} for each connected peer
        const peersToSendTo = Object.values(connections);
        if (!peersToSendTo.length) return displayPopup("<i class='bi bi-info-circle-fill'></i> No peers connected for sending files.");

        sendProgressList.innerHTML = ''; // Clear previous send progress UI

        selectedFiles.forEach(file => {
            peersToSendTo.forEach(connData => { // connData is { conn, name }
                const conn = connData.conn;
                // We still need the peerName here for the *initial* UI label and potential metadata error message
                const peerName = connData.name;
                const peerId = conn.peer; // Still need ID for internal tracking

                // Double-check connection is open and valid before starting send
                if (!conn || !conn.open || !connections[peerId]) {
                    console.warn(`Skipping send to ${peerName} (${peerId}), connection not open or invalid.`);
                    const failedLi = document.createElement('li');
                    failedLi.textContent = `Sending ${file.name} to ${peerName}: Failed (Connection Closed)`;
                    sendProgressList.appendChild(failedLi);
                    return; // Skip to next peer
                }

                // Create a unique ID for the progress element using PEER ID and sanitized file name
                const safeFileName = file.name.replace(/[^a-zA-Z0-9_-]/g, '-');
                const progressId = `send-${peerId}-${safeFileName}`; // Use peerId for reliable ID

                // Create progress UI element, using the PEER NAME for the initial display
                const li = document.createElement('li');
                li.id = progressId;
                // Initial label uses the name known when starting the send
                const label = document.createTextNode(`Sending ${file.name} to ${peerName}: `);
                const progress = document.createElement('progress');
                progress.max = file.size;
                progress.value = 0;
                li.append(label, progress);
                sendProgressList.appendChild(li);

                // --- Step 1: Send Metadata First ---
                const metadata = {
                    type: 'file-metadata',
                    fileName: file.name,
                    totalSize: file.size
                };
                console.log(`Sending metadata for ${file.name} to ${peerName} (${peerId})`);
                try {
                    conn.send(metadata);
                    // --- Step 2: Start sending chunks ---
                    sendFileChunked(file, conn, progress, li);

                } catch (error) {
                     // Error message uses the peerName known at this point
                     console.error(`Error sending metadata for ${file.name} to ${peerName} (${peerId}):`, error);
                     li.textContent = `Sending ${file.name} to ${peerName}: Metadata Send Error`;
                     progress?.remove();
                }
            });
        });

        // Clear file selection after initiating sends
        selectedFiles = [];
        fileList.innerHTML = '<li>No files selected.</li>'; // Clear selected file list UI
    });

    // Helper function to send a file in chunks
    function sendFileChunked(file, conn, progressBar, progressElement) {
        const chunkSize = 64 * 1024; // 64KB
        let offset = 0;
        const peerId = conn.peer; // Capture peerId for checks

        function readSlice() {
            // Fetch the receiver's name directly from the connections object for messages
            const receiverName = connections[peerId]?.name || `Peer_${peerId.substring(0,4)}`; // Add fallback

            // Check connection using peerId before reading/sending
            if (!connections[peerId] || !connections[peerId].conn?.open) {
                console.warn(`Connection to ${receiverName} (${peerId}) lost during send of ${file.name}. Aborting send.`);
                progressElement.textContent = `Sending ${file.name} to ${receiverName}: Failed (Disconnected)`;
                progressBar?.remove();
                return;
            }

            const slice = file.slice(offset, offset + chunkSize);
            const reader = new FileReader();

            reader.onload = evt => {
                // Fetch name again right before sending, in case it was updated
                const currentReceiverName = connections[peerId]?.name || receiverName;
                // Double-check connection right before sending
                if (!connections[peerId] || !connections[peerId].conn?.open) {
                   console.warn(`Connection to ${currentReceiverName} (${peerId}) lost just before sending chunk for ${file.name}. Aborting send.`);
                   progressElement.textContent = `Sending ${file.name} to ${currentReceiverName}: Failed (Disconnected)`;
                   progressBar?.remove();
                   return;
                }
                try {
                    const isLastChunk = offset + slice.size >= file.size;
                    const chunkData = {
                        type: 'file-chunk',
                        fileName: file.name,
                        chunk: evt.target.result, // ArrayBuffer
                        isLast: isLastChunk
                    };

                    conn.send(chunkData);

                    offset += slice.size;
                    if (progressBar) progressBar.value = offset;

                    if (offset < file.size) {
                        // Use setTimeout for non-blocking loop
                        setTimeout(readSlice, 0);
                    } else {
                        // Fetch the name AGAIN right before displaying the final message
                        const finalReceiverName = connections[peerId]?.name || currentReceiverName; // Use last known as fallback
                        console.log(`Finished sending ${file.name} to ${finalReceiverName} (${peerId})`);
                        progressElement.textContent = `Sent ${file.name} to ${finalReceiverName} (${formatBytes(file.size)})`;
                        progressBar?.remove();
                    }
                } catch (error) {
                    // Use currentReceiverName for error messages
                    console.error(`Error sending chunk for ${file.name} to ${currentReceiverName} (${peerId}):`, error);
                    progressElement.textContent = `Sending ${file.name} to ${currentReceiverName}: Send Error`;
                    progressBar?.remove();
                    // Optionally close connection on send error
                    // if (connections[peerId]) connections[peerId].conn.close();
                }
            };

            reader.onerror = (err) => {
                // Use receiverName (from start of readSlice) for error messages
                console.error(`FileReader error for ${file.name}:`, err);
                displayPopup(`<i class='bi bi-info-circle-fill'></i> Error reading file ${file.name}. Cannot send.`);
                progressElement.textContent = `Sending ${file.name} to ${receiverName}: Read Error`;
                progressBar?.remove();
            };

            reader.readAsArrayBuffer(slice);
        }
        readSlice(); // Start the sending process
    }


    // --- Receive & Reassemble File Chunks ---
    function handleData(data, conn) {
        const peerId = conn.peer;
        // Get peer name from our stored connections data - this might be updated by 'peer-name' message
        let peerName = connections[peerId]?.name || `Peer_${peerId.substring(0, 4)}`; // Fallback name

        // Use peerId in the key for uniqueness, but store peerName for UI
        const key = `${peerId}:${data.fileName}`;
        // Sanitize key based on peerId and filename for use as a DOM ID
        const safeFileName = data.fileName?.replace(/[^a-zA-Z0-9_-]/g, '-') || 'unknownfile';
        const sanitizedKey = `receive-${peerId}-${safeFileName}`;

        // --- Handle Metadata Message ---
        if (data.type === 'file-metadata' && data.fileName && data.totalSize !== undefined) {
            console.log(`Received metadata for ${data.fileName} (${formatBytes(data.totalSize)}) from ${peerName} (${peerId})`);

            // Check if transfer already exists (e.g., duplicate metadata message)
            if (incomingTransfers[key]) {
                console.warn(`Received duplicate metadata for ongoing transfer: ${key} from ${peerName}. Ignoring.`);
                return;
            }
             // Check if a previous transfer failed and element still exists
             const existingLi = document.getElementById(sanitizedKey);
             if (existingLi) {
                 console.warn(`UI element for ${key} already exists. Removing old element before starting new transfer.`);
                 existingLi.remove();
             }

            // Create progress UI element using the PEER NAME known at this time
            const li = document.createElement('li');
            li.id = sanitizedKey; // Use sanitized ID
            const label = document.createTextNode(`Receiving ${data.fileName} from ${peerName}: `);
            const progress = document.createElement('progress');
            progress.max = data.totalSize;
            progress.value = 0;
            li.append(label, progress);
            receivedFiles.appendChild(li); // Add to the received files list

            // Initialize transfer state in memory, include peerName
            incomingTransfers[key] = {
                buffer: [],
                receivedBytes: 0,
                totalSize: data.totalSize,
                progressElement: li, // Store reference to the UI element
                peerName: peerName   // Store name for potential error messages later
            };

        // --- Handle File Chunk Message ---
        } else if (data.type === 'file-chunk' && data.fileName && data.chunk) {
            const transfer = incomingTransfers[key];

            // Check if metadata was received first
            if (!transfer) {
                // Use the latest known peerName for the error message
                peerName = connections[peerId]?.name || peerName;
                console.error(`Received file chunk for ${data.fileName} from ${peerName} (${peerId}) before metadata. Discarding chunk.`);
                 const existingLi = document.getElementById(sanitizedKey);
                 if (existingLi && !existingLi.querySelector('a')) { // If it's still showing progress/error
                     existingLi.textContent = `Error receiving ${data.fileName} from ${peerName} (Missing Metadata)`;
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
                // Use the stored peerName from the transfer object, falling back to current lookup
                const finalPeerName = transfer.peerName || connections[peerId]?.name || peerName;
                if (transfer.receivedBytes === transfer.totalSize) {
                    // Successfully received all bytes
                    const fileType = 'application/octet-stream'; // Default type
                    const blob = new Blob(transfer.buffer, { type: fileType });
                    const url = URL.createObjectURL(blob);

                    // Replace progress bar with a download link, showing PEER NAME
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = data.fileName;
                    a.innerHTML = `${data.fileName} (${formatBytes(transfer.totalSize)})`;
                    transfer.progressElement.innerHTML = ''; // Clear existing content
                    transfer.progressElement.append(a, document.createTextNode(` (from ${finalPeerName})`));

                    console.log(`Finished receiving ${data.fileName} from ${finalPeerName} (${peerId})`);
                } else {
                    // Error: Received 'last chunk' flag but byte count doesn't match
                    console.error(`File transfer incomplete for ${data.fileName} from ${finalPeerName} (${peerId}). Expected ${transfer.totalSize} bytes, received ${transfer.receivedBytes}`);
                    transfer.progressElement.textContent = `Error receiving ${data.fileName} from ${finalPeerName} (Incomplete)`;
                }
                // Clean up transfer state from memory
                delete incomingTransfers[key];
            }
        // *** MODIFICATION START: Handle peer name message ***
        } else if (data.type === 'peer-name' && data.name) {
            console.log(`Received peer name update from ${peerId}: ${data.name}`);
            if (connections[peerId]) {
                // Check if the name actually changed before updating UI
                if (connections[peerId].name !== data.name) {
                    connections[peerId].name = data.name;
                    console.log(`Updating UI for peer ${peerId} with new name: ${data.name}`);
                    updatePeerList(); // Update the connected peers list display
                    displayPopup(`<i class='bi bi-check-circle-fill'></i> Connected to ${data.name}`);
                    // Update any ongoing transfer UI elements for this peer
                    Object.values(incomingTransfers).forEach(transfer => {
                        if (transfer.peerName !== data.name && transfer.progressElement.textContent.includes(peerName)) {
                             // Only update if the old name is still displayed and it's not a download link yet
                             if (transfer.progressElement.querySelector('progress')) {
                                 const labelNode = transfer.progressElement.childNodes[0];
                                 if (labelNode && labelNode.nodeType === Node.TEXT_NODE) {
                                     labelNode.textContent = labelNode.textContent.replace(peerName, data.name);
                                     transfer.peerName = data.name; // Update stored name too
                                 }
                             }
                        }
                    });
                    Object.values(sendProgressList.querySelectorAll('li')).forEach(li => {
                        const parts = li.id.split('-'); // send-${peerId}-${safeFileName}
                        if (parts.length >= 3 && parts[1] === peerId && li.textContent.includes(peerName)) {
                            if (li.querySelector('progress') || li.textContent.includes('Sending') || li.textContent.includes('Sent')) {
                                const labelNode = li.childNodes[0];
                                if (labelNode && labelNode.nodeType === Node.TEXT_NODE) {
                                    labelNode.textContent = labelNode.textContent.replace(peerName, data.name);
                                }
                            }
                        }
                    });
                    // Optional: Display a less intrusive confirmation than the initial 'Connected' popup
                    // displayPopup(`<i class='bi bi-info-circle-fill'></i> Peer ${peerId} is now known as ${data.name}`);
                } else {
                     console.log(`Received name ${data.name} for ${peerId}, but it's already set. No UI update needed.`);
                }
            } else {
                console.warn(`Received name for unknown/disconnected peer ${peerId}. Ignoring.`);
            }
        // *** MODIFICATION END ***
        } else {
            // Handle other data types if needed
            console.log(`Received unknown data type from ${peerName} (${peerId}):`, data);
        }
    }

    // --- Cleanup for Incomplete Transfers on Disconnect/Error ---
    // Added peerName parameter
    function cleanupIncompleteTransfers(peerId, peerName) {
        const nameToDisplay = peerName || `Peer_${peerId.substring(0, 4)}`; // Use provided name or generate fallback

        // Incoming transfers cleanup
        for (const key in incomingTransfers) {
            if (key.startsWith(peerId + ':')) {
                const transfer = incomingTransfers[key];
                const fileName = key.split(':')[1] || 'file';
                // Use the stored name if available, otherwise the passed name
                const finalPeerName = transfer.peerName || nameToDisplay;
                if (transfer.progressElement && !transfer.progressElement.querySelector('a')) { // Only update if not completed
                    transfer.progressElement.textContent = `Failed receiving ${fileName} from ${finalPeerName} (Disconnected)`;
                    transfer.progressElement.querySelector('progress')?.remove();
                }
                delete incomingTransfers[key];
                console.log(`Cleaned up incomplete incoming transfer ${key} from ${finalPeerName}`);
            }
        }

         // Outgoing transfers (UI update only)
        const sendingItems = sendProgressList.querySelectorAll('li');
        sendingItems.forEach(item => {
            // ID format is send-${peerId}-${safeFileName}
            const parts = item.id.split('-');
            if (parts.length >= 3 && parts[0] === 'send' && parts[1] === peerId) {
                 if (item.querySelector('progress')) { // Only update if still in progress
                     const fileName = item.textContent.match(/Sending (.*?) to/)?.[1] || 'file';
                     item.textContent = `Sending ${fileName} to ${nameToDisplay}: Failed (Disconnected)`;
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
        // Handle potential log(0) or negative bytes
        if (bytes <= 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        // Ensure i is within the bounds of the sizes array
        const index = Math.min(i, sizes.length - 1);
        return `${parseFloat((bytes / Math.pow(k, index)).toFixed(dm))} ${sizes[index]}`;
    }

}); // End DOMContentLoaded