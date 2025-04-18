// index.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Init PeerJS (will generate a random ID)
    const peer = new Peer();
    const connections = {};         // store active DataConnections
    const fileInput = document.getElementById('file-input');
    const sendButton = document.getElementById('send-button');
    const fileList = document.getElementById('file-list');
    const status = document.getElementById('status');
    const peerList = document.getElementById('peer-list');
    const receivedFiles = document.getElementById('received-files');
  
    let selectedFiles = [];
  
    // 2. When our peer is ready, show & let user copy the ID
    peer.on('open', id => {
      status.innerHTML = `
        Your ID: <code>${id}</code>
        <button id="copy-id">Copy ID</button>
      `;
      document.getElementById('copy-id')
        .addEventListener('click', () => {
          navigator.clipboard.writeText(id)
            .then(() => status.innerHTML += ' 👍');
        });
    });
  
    // 3. Handle incoming connection requests
    peer.on('connection', conn => setupConnection(conn));
  
    // 4. Inject UI for dialing out
    const connectionSection = document.getElementById('connection-section');
    const connectInput  = document.createElement('input');
    const connectButton = document.createElement('button');
    connectInput.id          = 'peer-id-input';
    connectInput.placeholder = 'Enter peer ID…';
    connectInput.style.marginRight = '8px';
    connectButton.id         = 'connect-button';
    connectButton.textContent= 'Connect';
    connectionSection.appendChild(connectInput);
    connectionSection.appendChild(connectButton);
  
    connectButton.addEventListener('click', () => {
      const remoteId = connectInput.value.trim();
      if (!remoteId) return alert('Please enter a peer ID.');
      if (connections[remoteId]) return alert('Already connected to ' + remoteId);
      const conn = peer.connect(remoteId, { reliable: true });
      setupConnection(conn);
    });
  
    // 5. Setup a new DataConnection
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
  
    // 6. Refresh the connected‑peers UI
    function updatePeerList() {
      peerList.innerHTML = '';
      const peers = Object.keys(connections);
      if (!peers.length) {
        status.textContent = 'Not connected';
        return;
      }
      status.textContent = 'Connected to: ' + peers.join(', ');
      peers.forEach(pid => {
        const li = document.createElement('li');
        li.textContent = pid;
        peerList.appendChild(li);
      });
    }
  
    // 7. File selection → list UI
    fileInput.addEventListener('change', e => {
      selectedFiles = Array.from(e.target.files);
      fileList.innerHTML = '';
      selectedFiles.forEach(f => {
        const li = document.createElement('li');
        li.textContent = f.name;
        fileList.appendChild(li);
      });
    });
  
    // 8. Send button → read & send each file as base64
    sendButton.addEventListener('click', () => {
      if (!selectedFiles.length) return alert('No files selected.');
      const peers = Object.values(connections);
      if (!peers.length)     return alert('No peers connected.');
      selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
          const dataUrl = e.target.result;
          peers.forEach(conn => conn.send({
            fileName: file.name,
            fileData: dataUrl
          }));
        };
        reader.readAsDataURL(file);
      });
    });
  
    // 9. Handle incoming file data
    function handleData(data, conn) {
      if (data.fileName && data.fileData) {
        const li = document.createElement('li');
        const a  = document.createElement('a');
        a.href        = data.fileData;
        a.download    = data.fileName;
        a.textContent = data.fileName;
        li.appendChild(a);
        li.append(` (from ${conn.peer})`);
        receivedFiles.appendChild(li);
      }
    }
  });
  