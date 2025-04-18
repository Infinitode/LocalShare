// index.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Globals & DOM References ---
    const peer = new Peer();
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
  
    // Buffer storage for incoming chunks
    const incomingBuffers = {};  // { "peerId:fileName": [ArrayBuffer, ...] }

    // --- Peer Setup ---
    peer.on('open', id => {
      status.innerHTML = `Your ID: <code>${id}</code> <button id="copy-id">Copy ID</button>`;
      document.getElementById('copy-id').addEventListener('click', () => {
        navigator.clipboard.writeText(id).then(() => {
          status.innerHTML += ' 👍';
        });
      });
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
      const conn = peer.connect(remoteId, { reliable: true });
      setupConnection(conn);
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
  
    // --- Send Files with Progress ---
    sendButton.addEventListener('click', () => {
      if (!selectedFiles.length) return alert('No files selected.');
      const peers = Object.values(connections);
      if (!peers.length) return alert('No peers connected.');

      selectedFiles.forEach(file => {
        // UI: create progress element
        const li = document.createElement('li');
        const label = document.createTextNode(`Sending ${file.name}: `);
        const progress = document.createElement('progress');
        progress.max = file.size;
        progress.value = 0;
        li.append(label, progress);
        sendProgressList.appendChild(li);

        // Send in 64KB chunks
        const chunkSize = 64 * 1024;
        const totalChunks = Math.ceil(file.size / chunkSize);

        peers.forEach(conn => {
          let offset = 0;
          function readSlice() {
            const slice = file.slice(offset, offset + chunkSize);
            const reader = new FileReader();
            reader.onload = evt => {
              conn.send({
                fileName: file.name,
                chunk: evt.target.result,
                isLast: offset + chunkSize >= file.size
              });
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
  
    // --- Receive & Reassemble ---
    function handleData(data, conn) {
      if (data.fileName && data.chunk) {
        const key = conn.peer + ':' + data.fileName;
        if (!incomingBuffers[key]) incomingBuffers[key] = [];
        incomingBuffers[key].push(data.chunk);
        if (data.isLast) {
          const blob = new Blob(incomingBuffers[key]);
          const url = URL.createObjectURL(blob);
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = url;
          a.download = data.fileName;
          a.textContent = data.fileName;
          li.append(a, document.createTextNode(` (from ${conn.peer})`));
          receivedFiles.appendChild(li);
          delete incomingBuffers[key];
        }
      }
    }
  });