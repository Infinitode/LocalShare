// index.js

// P2P File Transfer with Local LAN Discovery & Robust Short IDs
// NOTE: To enable peer discovery, your PeerServer must be started with `allow_discovery: true`.

// Example Node server config:
// const { PeerServer } = require('peer');
// PeerServer({ port: 9000, path: '/peerjs', allow_discovery: true });

document.addEventListener('DOMContentLoaded', () => {
    // --- Globals & DOM References ---
    // If you host your own PeerServer, point Peer() to it here:
    // const peer = new Peer(undefined, { host:'<your-server>', port:9000, path:'/peerjs', debug:2 });
    const peer = new Peer(); // default PeerJS cloud (note: discovery disabled there)

    const connections = {};
    let shortToFull = {}; // map: shortID -> [fullPeerId,...]
  
    // DOM nodes
    const fileInput     = document.getElementById('file-input');
    const sendButton    = document.getElementById('send-button');
    const fileList      = document.getElementById('file-list');
    const status        = document.getElementById('status');
    const peerList      = document.getElementById('peer-list');
    const receivedFiles = document.getElementById('received-files');
    const connSection   = document.getElementById('connection-section');

    // Progress lists
    const sendProgressList    = document.createElement('ul'); sendProgressList.id = 'send-progress-list';
    fileList.parentNode.insertBefore(sendProgressList, fileList.nextSibling);
    const receiveProgressList = document.createElement('ul'); receiveProgressList.id = 'receive-progress-list';
    receivedFiles.parentNode.insertBefore(receiveProgressList, receivedFiles);
  
    // Nearby Peers UI
    const nearbyLabel = document.createElement('h3'); nearbyLabel.textContent = 'Nearby Short IDs';
    const nearbyList  = document.createElement('ul'); nearbyList.id = 'nearby-peers-list';
    const refreshBtn  = document.createElement('button');
    refreshBtn.textContent = 'Refresh Nearby';
    refreshBtn.style.marginBottom = '10px';
    connSection.append(nearbyLabel, refreshBtn, nearbyList);

    let selectedFiles = [];
    const incomingBuffers = {};
    const receiverProgress = {};

    // --- Utility: generate short ID (last 6 chars) ---
    const makeShort = id => id.slice(-6);

    // --- Peer Initialization ---
    peer.on('open', id => {
      const short = makeShort(id);
      status.innerHTML = `Your Short ID: <code>${short}</code> <button id="copy-short">Copy Short ID</button> <em>(LAN discovery may be limited)</em>`;
      document.getElementById('copy-short').onclick = () => navigator.clipboard.writeText(short).then(() => status.innerHTML += ' 👍');
    });
    peer.on('connection', conn => setupConnection(conn));
    peer.on('error', err => console.error('Peer error:', err));
  
    // --- Manual Nearby Refresh ---
    refreshBtn.onclick = discoverPeers;

    function discoverPeers() {
      if (!peer.listAllPeers) {
        alert('Discovery not supported by this server.');
        return;
      }
      peer.listAllPeers()
        .then(peers => {
          shortToFull = {};
          nearbyList.innerHTML = '';
          peers.filter(p => p !== peer.id && !connections[p])
               .forEach(remoteId => {
                 const shortId = makeShort(remoteId);
                 (shortToFull[shortId] = shortToFull[shortId] || []).push(remoteId);
                 const li = document.createElement('li');
                 const btn= document.createElement('button');
                 btn.textContent = shortId;
                 btn.title = remoteId; // show full ID on hover
                 btn.onclick = () => dialPeer(shortId);
                 li.append(btn);
                 nearbyList.append(li);
               });
          if (nearbyList.children.length === 0) {
            nearbyList.innerHTML = '<li>No peers found. Make sure your PeerServer supports discovery and peers are online.</li>';
          }
        })
        .catch(err => {
          console.warn('Discovery error:', err);
          alert('Error discovering peers. Check server allow_discovery setting.');
        });
    }

    // --- Dial-in UI (short IDs) ---
    const input  = document.createElement('input');
    const button = document.createElement('button');
    input.placeholder = 'Enter short ID…';
    input.style.margin = '10px 8px 10px 0';
    button.textContent = 'Connect';
    connSection.append(input, button);
    button.onclick = () => dialPeer(input.value.trim());
  
    function dialPeer(shortId) {
      if (!shortId) return alert('Enter a short ID.');
      const candidates = shortToFull[shortId];
      if (!candidates || !candidates.length) return alert('Short ID not found. Try refresh.');
      let full;
      if (candidates.length === 1) {
        full = candidates[0];
      } else {
        const choice = prompt(
          `Multiple peers match short ID '${shortId}':\n` +
          candidates.map((c,i) => `${i+1}: ${c}`).join('\n') +
          '\nEnter number to connect:'
        );
        const idx = parseInt(choice) - 1;
        if (!candidates[idx]) return alert('Invalid selection.');
        full = candidates[idx];
      }
      if (connections[full]) return alert('Already connected.');
      setupConnection(peer.connect(full, { reliable: true }));
    }

    // --- Connection Handler & Peer List ---
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
      const ids = Object.keys(connections);
      if (!ids.length) {
        status.textContent = 'Not connected';
        return;
      }
      status.textContent = 'Connected: ' + ids.map(makeShort).join(', ');
      ids.forEach(full => {
        const li = document.createElement('li');
        li.textContent = makeShort(full);
        li.title = full;
        peerList.append(li);
      });
    }
  
    // --- File Selection UI ---
    fileInput.onchange = e => {
      selectedFiles = Array.from(e.target.files);
      fileList.innerHTML = '';
      sendProgressList.innerHTML = '';
      selectedFiles.forEach(f => {
        const li = document.createElement('li');
        li.textContent = f.name;
        fileList.append(li);
      });
    };
  
    // --- Send Files: Chunks + Progress ---
    sendButton.onclick = () => {
      if (!selectedFiles.length) return alert('No files chosen.');
      const peers = Object.values(connections);
      if (!peers.length) return alert('No peers connected.');

      selectedFiles.forEach(file => {
        // broadcast metadata
        peers.forEach(c => c.send({ type:'metadata', fileName:file.name, fileSize:file.size }));
        // sender UI
        const li = document.createElement('li');
        const txt= document.createTextNode(`Sending ${file.name}: `);
        const bar= document.createElement('progress'); bar.max=file.size; bar.value=0;
        li.append(txt, bar);
        sendProgressList.append(li);
        // chunk send
        const size= file.size, chunk=64*1024;
        peers.forEach(c => {
          let offset=0;
          const sendChunk = () => {
            const slice=file.slice(offset, offset+chunk);
            const reader=new FileReader();
            reader.onload = evt => {
              c.send({ type:'chunk', fileName:file.name, chunk:evt.target.result, isLast: offset+chunk>=size });
              offset+=chunk; bar.value=offset;
              if(offset<size) sendChunk();
            };
            reader.readAsArrayBuffer(slice);
          };
          sendChunk();
        });
      });
    };
  
    // --- Receive & Assemble with Progress ---
    function handleData(data, conn) {
      const key = conn.peer + ':' + data.fileName;
      if (data.type==='metadata') {
        incomingBuffers[key]=[];
        const li = document.createElement('li');
        const txt= document.createTextNode(`Receiving ${data.fileName} from ${makeShort(conn.peer)}: `);
        const bar= document.createElement('progress'); bar.max=data.fileSize; bar.value=0;
        li.append(txt, bar);
        receiveProgressList.append(li);
        receiverProgress[key]={ bar };
        return;
      }
      if (data.type==='chunk') {
        incomingBuffers[key].push(data.chunk);
        const { bar } = receiverProgress[key]||{};
        if(bar) bar.value += data.chunk.byteLength;
        if(data.isLast) {
          const blob=new Blob(incomingBuffers[key]);
          const url=URL.createObjectURL(blob);
          const li=document.createElement('li');
          const a =document.createElement('a');
          a.href=url; a.download=data.fileName; a.textContent=data.fileName;
          li.append(a, document.createTextNode(` (from ${makeShort(conn.peer)})`));
          receivedFiles.append(li);
          delete incomingBuffers[key]; delete receiverProgress[key];
        }
      }
    }
  });