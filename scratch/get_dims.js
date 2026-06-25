const fs = require('fs');
const path = require('path');

function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  // PNG signature is 8 bytes. IHDR chunk starts at byte 8.
  // Length (4 bytes), Chunk Type 'IHDR' (4 bytes), Width (4 bytes), Height (4 bytes)
  const width = buffer.readInt32BE(16);
  const height = buffer.readInt32BE(20);
  return { width, height };
}

const chatboxPath = path.join(__dirname, '..', 'public', 'chatbox.png');
const mergePath = path.join(__dirname, '..', 'public', 'merge.png');

console.log('chatbox.png dimensions:', getPngDimensions(chatboxPath));
console.log('merge.png dimensions:', getPngDimensions(mergePath));
