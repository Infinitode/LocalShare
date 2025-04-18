// index.js

// P2P File Transfer with Progress & Peer Discovery

document.addEventListener('DOMContentLoaded', () => {
    // --- Globals & DOM References ---
    const peer = new Peer();            // PeerJS instance
    const connections = {};
  
    // DOM nodes
    const fileInput            = document.getElementById('file-input');
    const sendButton           = document.getElementById('send-button');
    const fileList             = document.getElementById('file-list');
    const status               = document.getElementById('status');
    const peerList             = document.getElementById('peer-list');
    const receivedFiles        = document.getElementById('received-files');
    const connSection          = document.getElementById('connection-section');

    // Progress lists
    const sendProgressList     = document.createElement('ul'); sendProgressList.id = 'send-progress-list';
    fileList.parentNode.insertBefore(sendProgressList, fileList.nextSibling);
    const receiveProgressList  = document.createElement('ul'); receiveProgressList.id = 'receive-progress-list';
    receivedFiles.parentNode.insertBefore(receiveProgressList, receivedFiles);
  
    // Discovered peers list
    const nearbyPeersLabel     = document.createElement('h3'); nearbyPeersLabel.textContent = 'Nearby Peers';
    const nearbyPeersList      = document.createElement('ul'); nearbyPeersList.id = 'nearby-peers-list';
    connSection.append(nearbyPeersLabel, nearbyPeersList);

    let selectedFiles = [];
    const incomingBuffers = {};   // { key: [ArrayBuffer,...] }
    const receiverProgress = {};  // { key: { bar: HTMLProgressElement, total: number } }

    // --- Peer Setup ---
    peer.on('open', id => {
      status.innerHTML = `Your ID: <code>${id}</code> <button id="copy-id">Copy ID</button> <em>(discovery ON)</em>`;
      document.getElementById('copy-id').onclick = () => navigator.clipboard.writeText(id).then(() => status.innerHTML += ' 👍');

      // Periodic discovery
      setInterval(() => peer.listAllPeers && peer.listAllPeers(peers => updateNearby(peers)), 10000);
    });
    peer.on('error', err => console.error('Peer error:', err));
    peer.on('connection', conn => setupConnection(conn));
  
    // --- Dial-in UI ---
    const connectInput  = document.createElement('input');
    const connectButton = document.createElement('button');
    connectInput.id           = 'peer-id-input';
    connectInput.placeholder  = 'Enter peer ID…';
    connectInput.style.marginRight = '8px';
    connectButton.id          = 'connect-button';
    connectButton.textContent = 'Connect';
    connSection.append(connectInput, connectButton);
    connectButton.onclick = () => {
      const remoteId = connectInput.value.trim();
      if (!remoteId) return alert('Enter a peer ID.');
      if (connections[remoteId]) return alert('Already connected to ' + remoteId);
      setupConnection(peer.connect(remoteId, { reliable: true }));
    };
  
    // --- Update Nearby Peers List ---
    function updateNearby(allPeers) {
      nearbyPeersList.innerHTML = '';
      allPeers.forEach(remoteId => {
        if (remoteId === peer.id || connections[remoteId]) return;
        const li = document.createElement('li');
        const btn= document.createElement('button');
        btn.textContent = remoteId;
        btn.style.cursor = 'pointer';
        btn.onclick = () => setupConnection(peer.connect(remoteId, { reliable: true }));
        li.append(btn);
        nearbyPeersList.append(li);
      });
    }

    // --- Connection Handler ---
    function setupConnection(conn) {
      conn.on('open', () => {
        connections[conn.peer] = conn;
        updatePeerList();
        conn.on('data', data => handleData(data, conn));
      });
      conn.on('close', () => {
        delete connections[conn.peer];
        updatePeerList();
      });
    }
    function updatePeerList() {
      peerList.innerHTML = '';
      const peers = Object.keys(connections);
      status.textContent   = peers.length ? 'Connected: ' + peers.join(', ') : 'Not connected';
      peers.forEach(pid => {
        const li = document.createElement('li'); li.textContent = pid;
        peerList.append(li);
      });
    }
  
    // --- File Selection & UI ---
    fileInput.onchange = e => {
      selectedFiles = Array.from(e.target.files);
      fileList.innerHTML        = '';
      sendProgressList.innerHTML= '';
      selectedFiles.forEach(f => {
        const li = document.createElement('li'); li.textContent = f.name;
        fileList.append(li);
      });
    };
  
    // --- Send Files with Chunking & Progress ---
    sendButton.onclick = () => {
      if (!selectedFiles.length) return alert('No files chosen.');
      const peers = Object.values(connections);
      if (!peers.length) return alert('No peers connected.');

      selectedFiles.forEach(file => {
        // inform receivers
        peers.forEach(c => c.send({ type:'metadata', fileName:file.name, fileSize:file.size }));

        // UI progress
        const li   = document.createElement('li');
        const txt  = document.createTextNode(`Sending ${file.name}: `);
        const bar  = document.createElement('progress'); bar.max=file.size; bar.value=0;
        li.append(txt, bar);
        sendProgressList.append(li);

        // chunked send
        const chunkSize = 64*1024;
        peers.forEach(conn => {
          let offset = 0;
          (function sendChunk() {
            const slice = file.slice(offset, offset+chunkSize);
            const reader = new FileReader();
            reader.onload = evt => {
              conn.send({ type:'chunk', fileName:file.name, chunk:evt.target.result, isLast: offset+chunkSize>=file.size });
              offset += chunkSize;
              bar.value = offset;
              if (offset < file.size) sendChunk();
            };
            reader.readAsArrayBuffer(slice);
          })();
        });
      });
    };
  
    // --- Receive & Reassemble with Progress ---
    function handleData(data, conn) {
      const key = conn.peer + ':' + data.fileName;

      if (data.type==='metadata') {
        incomingBuffers[key]      = [];
        // show receive progress
        const li  = document.createElement('li');
        const txt = document.createTextNode(`Receiving ${data.fileName} from ${conn.peer}: `);
        const bar = document.createElement('progress'); bar.max=data.fileSize; bar.value=0;
        bar.id  = `${key}-bar`;
        li.append(txt, bar);
        receiveProgressList.append(li);
        receiverProgress[key] = { bar, total: data.fileSize };
        return;
      }

      if (data.type==='chunk') {
        incomingBuffers[key].push(data.chunk);
        const { bar } = receiverProgress[key]||{};
        if (bar) bar.value += data.chunk.byteLength;
        if (data.isLast) {
          const blob = new Blob(incomingBuffers[key]);
          const url  = URL.createObjectURL(blob);
          const li   = document.createElement('li');
          const a    = document.createElement('a');
          a.href     = url; a.download = data.fileName; a.textContent = data.fileName;
          li.append(a, document.createTextNode(` (from ${conn.peer})`));
          receivedFiles.append(li);
          delete incomingBuffers[key]; delete receiverProgress[key];
        }
      }
    }
  });