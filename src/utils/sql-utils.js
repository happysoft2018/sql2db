function computeMaxChunkSize(keyColumnsCount = 1, maxParams = 2000) {
  if (!Number.isFinite(keyColumnsCount) || keyColumnsCount <= 0) return maxParams;
  return Math.max(1, Math.floor(maxParams / keyColumnsCount));
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

module.exports = {
  computeMaxChunkSize,
  chunkArray,
};
