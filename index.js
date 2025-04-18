// index.js

// P2P File Transfer with LAN WebSocket Discovery & Short IDs
// Requires: a simple LAN WebSocket server relaying connected PeerJS IDs.
// Example: Node ws server that tracks clients and broadcasts { type:'peers', peers: [id1,id2,...] }

(function() {
    // === Configuration ===
    const DISCOVERY_SERVER = 'ws://<LAN_SERVER_IP>:3000'; // e.g. ws://192.168.1.50:3000
    const SHORT_LEN = 6;

    // === DOM Elements ===
    const fileInput        = document.getElementById('file-input');
    const sendButton       = document.getElementById('send-button');
    const fileList         = document.getElementById('file-list');
    const status           = document.getElementById('status');
    const peerList         = document.getElementById('peer-list');
    const receivedFiles    = document.getElementById('received-files');
    const connSection      = document.getElementById('connection-section');

    // dynamic lists
    const sendProgressList     = document.createElement('ul'); sendProgressList.id = 'send-progress-list';
    fileList.parentNode.insertBefore(sendProgressList, fileList.nextSibling);
    const receiveProgressList  = document.createElement('ul'); receiveProgressList.id = 'receive-progress-list';
    receivedFiles.parentNode.insertBefore(receiveProgressList, receivedFiles);
    const nearbyLabel    = document.createElement('h3'); nearbyLabel.textContent = 'Nearby Peers';
    const nearbyList     = document.createElement('ul'); nearbyList.id = 'nearby-peers-list';
    connSection.append(nearbyLabel, nearbyList);
  
    const peerInput      = document.createElement('input'); peerInput.placeholder = 'Enter short ID…';
    const peerBtn        = document.createElement('button'); peerBtn.textContent = 'Connect';
    connSection.append(peerInput, peerBtn);

    // === State ===
    const connections    = {};            // fullID -> DataConnection
    let selectedFiles    = [];
    const shortToFull    = {};            // shortID -> [fullID,...]
    const incomingBuffers= {};
    const receiverProg   = {};            // key -> progress bar

    // === Utilities ===
    const makeShort = id => id.slice(-SHORT_LEN);
    const keyFor = (peerId, fileName) => peerId + ':' + fileName;

    // === PeerJS Setup ===
    const peer = new Peer(); // default cloud; replace constructor args to point to your own server
    peer.on('open', id => {
      const short = makeShort(id);
      status.innerHTML = `Your Short ID: <code>${short}</code> <button id="copy-short">Copy</button>`;
      document.getElementById('copy-short').onclick = () => navigator.clipboard.writeText(short);
      // after open, announce via WS
      if (discSocket.readyState === WebSocket.OPEN) {
        discSocket.send(JSON.stringify({ type:'announce', id }));
      }
    });
    peer.on('connection', conn => setupConnection(conn));
    peer.on('error', err => console.error('PeerJS', err));
  
    // === Discovery WebSocket ===
    const discSocket = new WebSocket(DISCOVERY_SERVER);
    discSocket.onopen = () => console.log('Discovery WS connected');
    discSocket.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'peers') showNearby(msg.peers);
      } catch(e) {
        console.warn('Bad discovery message', e);
      }
    };
    discSocket.onerror = e => console.error('Discovery WS error', e);

    function showNearby(peerIds) {
      nearbyList.innerHTML = '';
      shortToFull = {};
      peerIds
        .filter(id => id !== peer.id && !connections[id])
        .forEach(id => {
          const short = makeShort(id);
          (shortToFull[short] = shortToFull[short]||[]).push(id);
        });
      if (Object.keys(shortToFull).length === 0) {
        nearbyList.innerHTML = '<li>No peers found</li>';
        return;
      }
      Object.keys(shortToFull).forEach(short => {
        const li = document.createElement('li');
        const btn= document.createElement('button');
        btn.textContent = short;
        btn.title = shortToFull[short].join(', ');
        btn.onclick = () => dial(short);
        li.append(btn);
        nearbyList.append(li);
      });
    }
  
    // === Dial by Short ID ===
    peerBtn.onclick = () => dial(peerInput.value.trim());
    function dial(short) {
      if (!shortToFull[short]) return alert('No such peer');
      const arr = shortToFull[short];
      let full = arr[0];
      if (arr.length > 1) {
        const choice = prompt(`Multiple peers match ${short}:\n` + arr.map((id,i)=>`${i+1}: ${id}`).join('\n'));
        full = arr[parseInt(choice)-1];
      }
      if (!full) return;
      setupConnection(peer.connect(full, { reliable:true }));
    }

    // === Connection Handler ===
    function setupConnection(conn) {
      conn.on('open', () => {
        connections[conn.peer] = conn;
        updatePeerUI();
        conn.on('data', data => handleData(data, conn));
        // announce this new connection to disco
        if (discSocket.readyState === WebSocket.OPEN) discSocket.send(JSON.stringify({ type:'announce', id: peer.id }));
      });
      conn.on('close', () => { delete connections[conn.peer]; updatePeerUI(); });
    }
    function updatePeerUI() {
      peerList.innerHTML = '';
      const keys = Object.keys(connections);
      status.textContent = keys.length ? 'Connected: ' + keys.map(makeShort).join(', ') : 'Not connected';
      keys.forEach(full => {
        const li = document.createElement('li'); li.textContent = makeShort(full);
        li.title = full; peerList.append(li);
      });
    }
  
    // === File Selection ===
    fileInput.onchange = e => {
      selectedFiles = Array.from(e.target.files);
      fileList.innerHTML = '';
      sendProgressList.innerHTML = '';
      selectedFiles.forEach(f=>{const li=document.createElement('li');li.textContent=f.name;fileList.append(li)});
    };
  
    // === Send Files ===
    sendButton.onclick = () => {
      if (!selectedFiles.length) return alert('Select files');
      const peers = Object.values(connections);
      if (!peers.length) return alert('No peers');
      selectedFiles.forEach(file => {
        peers.forEach(c => c.send({ type:'metadata', fileName:file.name, fileSize:file.size }));
        const li = document.createElement('li');
        const txt= document.createTextNode(`Sending ${file.name}: `);
        const bar= document.createElement('progress'); bar.max=file.size; bar.value=0;
        li.append(txt,bar); sendProgressList.append(li);
        const chunkSize=64*1024; let off;
        peers.forEach(c=>{
          off=0; (function sendChunk(){
            const slice = file.slice(off, off+chunkSize);
            const reader = new FileReader();
            reader.onload = evt => {
              c.send({ type:'chunk', fileName:file.name, chunk:evt.target.result, isLast:off+chunkSize>=file.size });
              off+=chunkSize; bar.value=off;
              if(off<file.size) sendChunk();
            };
            reader.readAsArrayBuffer(slice);
          })();
        });
      });
    };
  
    // === Receive Files ===
    function handleData(data, conn) {
      const key = keyFor(conn.peer, data.fileName);
      if (data.type==='metadata') {
        incomingBuffers[key]=[];
        const li = document.createElement('li');
        const txt= document.createTextNode(`Receiving ${data.fileName} from ${makeShort(conn.peer)}: `);
        const bar= document.createElement('progress'); bar.max=data.fileSize; bar.value=0;
        li.append(txt,bar); receiveProgressList.append(li);
        receiverProg[key]={bar};
      }
      if (data.type==='chunk') {
        incomingBuffers[key].push(data.chunk);
        const { bar }= receiverProg[key]||{};
        if(bar) bar.value+= data.chunk.byteLength;
        if (data.isLast) {
          const blob = new Blob(incomingBuffers[key]);
          const url  = URL.createObjectURL(blob);
          const li   = document.createElement('li');
          const a    = document.createElement('a'); a.href=url; a.download=data.fileName; a.textContent=data.fileName;
          li.append(a, document.createTextNode(` (from ${makeShort(conn.peer)})`)); receivedFiles.append(li);
          delete incomingBuffers[key]; delete receiverProg[key];
        }
      }
    }
  })();
