const fs = require('fs');
const path = require('path');

function inspectTkhd(filePath) {
  const buffer = fs.readFileSync(filePath);
  
  let offset = -1;
  for (let i = 0; i < buffer.length - 4; i++) {
    if (buffer[i] === 0x74 && buffer[i+1] === 0x6b && buffer[i+2] === 0x68 && buffer[i+3] === 0x64) {
      offset = i;
      // Let's print the first match and its surroundings
      console.log(`--- ${path.basename(filePath)} tkhd match at offset ${offset} ---`);
      const chunk = buffer.slice(offset, offset + 100);
      console.log(chunk.toString('hex'));
    }
  }
}

const newNodePath = path.join(__dirname, '..', 'public', 'new_node.mp4');
const colabPath = path.join(__dirname, '..', 'public', 'colab.mp4');

inspectTkhd(newNodePath);
inspectTkhd(colabPath);
