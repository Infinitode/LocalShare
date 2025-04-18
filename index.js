// index.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Globals & DOM References ---
    const peer = new Peer();            // PeerJS instance
    const connections = {};
    const fileInput = document.getElementById('file-input');
    const sendButton = document.getElementById('send-button');
    const fileList = document.getElementById('file-list');
    const status = document.getElementById('status');
    const peerList = document.getElementById('peer-list');
    const receivedFiles = document.getElementById('received-files');
  
    let selectedFiles = [];
    const sendProgressList = document.createElement('ul');
    sendProgressList.id = 'send-progress-list';
    fileList.parentNode.insertBefore(sendProgressList, fileList.nextSibling);
  
    const receiveProgressList = document.createElement('ul');
    receiveProgressList.id = 'receive-progress-list';
    receivedFiles.parentNode.insertBefore(receiveProgressList, receivedFiles);

    const incomingBuffers = {};   // { key: [ArrayBuffer,...] }
    const receiverProgress = {};  // { key: { bar: HTMLProgressElement, total: number } }

    // --- Peer Setup ---
    peer.on('open', id => {
      status.innerHTML = `Your ID: <code>${id}</code> <button id="copy-id">Copy ID</button> <em>(auto-discovery ON)</em>`;
      document.getElementById('copy-id').addEventListener('click', () => navigator.clipboard.writeText(id).then(() => status.innerHTML += ' 👍'));

      // Start auto-discovery every 10s
      setInterval(() => {
        if (peer.listAllPeers) {
          peer.listAllPeers(peers => {
            peers.forEach(remoteId => {
              if (remoteId === peer.id || connections[remoteId]) return;
              const conn = peer.connect(remoteId, { reliable: true });
              setupConnection(conn);
            });
          });
        }
      }, 10000);
    });
    peer.on('error', err => console.error('Peer error:', err));
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
      setupConnection(peer.connect(remoteId, { reliable: true }));
    });
  
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
      if (!peers.length) {
        status.textContent = 'Not connected';
        return;
      }
      status.textContent = 'Connected to: ' + peers.join(', ');
      peers.forEach(pid => {
        const li = document.createElement('li'); li.textContent = pid;
        peerList.appendChild(li);
      });
    }
  
    // --- File Selection ---
    fileInput.addEventListener('change', e => {
      selectedFiles = Array.from(e.target.files);
      fileList.innerHTML = '';
      sendProgressList.innerHTML = '';
      selectedFiles.forEach(f => {
        const li = document.createElement('li'); li.textContent = f.name;
        fileList.appendChild(li);
      });
    });
  
    // --- Send Files with Large-file Support ---
    sendButton.addEventListener('click', () => {
      if (!selectedFiles.length) return alert('No files selected.');
      const peers = Object.values(connections);
      if (!peers.length) return alert('No peers connected.');

      selectedFiles.forEach(file => {
        const keyBase = file.name;
        const chunkSize = 64 * 1024; // 64KB
        // Broadcast metadata first
        peers.forEach(conn => conn.send({ type: 'metadata', fileName: file.name, fileSize: file.size }));

        // UI: send progress
        const li = document.createElement('li');
        const label = document.createTextNode(`Sending ${file.name}: `);
        const progress = document.createElement('progress');
        progress.max = file.size;
        progress.value = 0;
        li.append(label, progress);
        sendProgressList.appendChild(li);

        peers.forEach(conn => {
          let offset = 0;
          function readSlice() {
            const slice = file.slice(offset, offset + chunkSize);
            const reader = new FileReader();
            reader.onload = evt => {
              conn.send({ type: 'chunk', fileName: file.name, chunk: evt.target.result, isLast: offset + chunkSize >= file.size });
              offset += chunkSize;
              progress.value = offset;
              if (offset < file.size) readSlice();
            };
            reader.readAsArrayBuffer(slice);
          }
          readSlice();
        });
      });
    });
  
    // --- Receiving & Tracking Progress ---
    function handleData(data, conn) {
      const key = conn.peer + ':' + data.fileName;
      // Metadata packet
      if (data.type === 'metadata') {
        incomingBuffers[key] = [];
        // Setup receive UI
        const li = document.createElement('li');
        const label = document.createTextNode(`Receiving ${data.fileName} from ${conn.peer}: `);
        const progress = document.createElement('progress');
        progress.max = data.fileSize;
        progress.value = 0;
        progress.id = `${key}-progress`;
        li.append(label, progress);
        receiveProgressList.appendChild(li);
        receiverProgress[key] = { bar: progress, total: data.fileSize };
        return;
      }
      // Chunk data
      if (data.type === 'chunk') {
        incomingBuffers[key].push(data.chunk);
        // Update progress bar
        const { bar } = receiverProgress[key] || {};
        if (bar) bar.value += data.chunk.byteLength;

        if (data.isLast) {
          // Assemble blob
          const blob = new Blob(incomingBuffers[key]);
          const url = URL.createObjectURL(blob);
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = url;
          a.download = data.fileName;
          a.textContent = data.fileName;
          li.append(a, document.createTextNode(` (from ${conn.peer})`));
          receivedFiles.appendChild(li);
          // Clean up
          delete incomingBuffers[key];
          delete receiverProgress[key];
        }
      }
    }
  });