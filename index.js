// index.js

// P2P File Transfer with Local LAN Discovery & Short IDs

document.addEventListener('DOMContentLoaded', () => {
    // --- Globals & DOM References ---
    const peer = new Peer(); // PeerJS instance
    const connections = {};
    const shortToFull = {};  // map shortID -> full peerID for dialing
  
    // DOM nodes
    const fileInput    = document.getElementById('file-input');
    const sendButton   = document.getElementById('send-button');
    const fileList     = document.getElementById('file-list');
    const status       = document.getElementById('status');
    const peerList     = document.getElementById('peer-list');
    const receivedFiles= document.getElementById('received-files');
    const connSection  = document.getElementById('connection-section');

    // Progress lists
    const sendProgressList    = document.createElement('ul'); sendProgressList.id = 'send-progress-list';
    fileList.parentNode.insertBefore(sendProgressList, fileList.nextSibling);
    const receiveProgressList = document.createElement('ul'); receiveProgressList.id = 'receive-progress-list';
    receivedFiles.parentNode.insertBefore(receiveProgressList, receivedFiles);
  
    // Nearby Peers
    const nearbyLabel = document.createElement('h3'); nearbyLabel.textContent = 'Nearby Short IDs';
    const nearbyList  = document.createElement('ul'); nearbyList.id = 'nearby-peers-list';
    connSection.append(nearbyLabel, nearbyList);

    let selectedFiles = [];
    const incomingBuffers = {};
    const receiverProgress = {};

    // --- Utility: generate short ID (last6 of full) ---
    const makeShort = id => id.slice(-6);

    // --- Peer Setup ---
    peer.on('open', id => {
      const short = makeShort(id);
      status.innerHTML = `Your Short ID: <code>${short}</code> <button id="copy-short">Copy Short ID</button> <em>(LAN discovery ON)</em>`;
      document.getElementById('copy-short').onclick = () =>
        navigator.clipboard.writeText(short).then(() => status.innerHTML += ' 👍');

      // Periodic LAN discovery (via server listAllPeers but filtering to same LAN if possible)
      setInterval(() => {
        peer.listAllPeers && peer.listAllPeers()
          .then(peers => {
            nearbyList.innerHTML = '';
            peers.filter(p => p !== peer.id && !connections[p])
                 .forEach(remoteId => {
                   const shortId = makeShort(remoteId);
                   shortToFull[shortId] = remoteId;
                   const li = document.createElement('li');
                   const btn= document.createElement('button');
                   btn.textContent = shortId;
                   btn.onclick = () => dialPeer(shortId);
                   li.append(btn);
                   nearbyList.append(li);
                 });
          })
          .catch(() => {});
      }, 8000);
    });
    peer.on('connection', conn => setupConnection(conn));
    peer.on('error', err => console.error(err));
  
    // --- Dial-in UI (short ID) ---
    const input  = document.createElement('input');
    const button = document.createElement('button');
    input.placeholder = 'Enter short ID…';
    input.style.marginRight = '8px';
    button.textContent = 'Connect';
    connSection.append(input, button);
    button.onclick = () => dialPeer(input.value.trim());
  
    function dialPeer(shortId) {
      if (!shortId) return alert('Enter a short ID.');
      const full = shortToFull[shortId];
      if (!full) return alert('Short ID not found.');
      if (connections[full]) return alert('Already connected.');
      setupConnection(peer.connect(full, { reliable: true }));
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
      const keys = Object.keys(connections);
      if (!keys.length) { status.textContent = 'Not connected'; return; }
      status.textContent = 'Connected to: ' + keys.map(makeShort).join(', ');
      keys.forEach(pid => {
        const li = document.createElement('li');
        li.textContent = makeShort(pid);
        peerList.append(li);
      });
    }
  
    // --- File Selection ---
    fileInput.onchange = e => {
      selectedFiles = Array.from(e.target.files);
      fileList.innerHTML = '';
      sendProgressList.innerHTML = '';
      selectedFiles.forEach(f => {
        const li = document.createElement('li'); li.textContent = f.name;
        fileList.append(li);
      });
    };
  
    // --- Send with Chunks + Progress ---
    sendButton.onclick = () => {
      if (!selectedFiles.length) return alert('No files chosen.');
      const peers = Object.values(connections);
      if (!peers.length) return alert('No peers connected.');

      selectedFiles.forEach(file => {
        peers.forEach(c => c.send({ type:'metadata', fileName:file.name, fileSize:file.size }));
        const li = document.createElement('li');
        const txt= document.createTextNode(`Sending ${file.name}: `);
        const bar= document.createElement('progress'); bar.max=file.size; bar.value=0;
        li.append(txt, bar);
        sendProgressList.append(li);
        const size = file.size, chunk=64*1024;
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
  
    // --- Receive & Show Progress ---
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
        if(bar) bar.value+=data.chunk.byteLength;
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